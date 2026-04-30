import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  jobs,
  jobApplications,
  projects,
  projectMembers,
  coderProfiles,
  conversations,
  conversationParticipants,
  messages,
} from "@/db/schema";
import { publishConversationEvent } from "@/lib/conversation-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/jobs/[id]/start-project — owner-only.
// Creates a project workspace seeded from the job (title + description),
// adds the client + every "hired" applicant as members, and stores the
// new projectId on the job. Idempotent: if jobs.projectId is already set
// we just return that — no duplicate projects.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: jobId } = await ctx.params;

  const [job] = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      clientId: jobs.clientId,
      projectId: jobs.projectId,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job || job.clientId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent return when already linked.
  if (job.projectId) {
    return NextResponse.json({ id: job.projectId, alreadyExisted: true });
  }

  // Pull every hired applicant for this job; need their userId + first
  // specialty to seed a roleLabel. Also keep the application id so we can
  // transition the existing job_application conversations into project ones.
  const hired = await db
    .select({
      applicationId: jobApplications.id,
      creatorId: jobApplications.creatorId,
      specialties: coderProfiles.specialties,
    })
    .from(jobApplications)
    .leftJoin(coderProfiles, eq(coderProfiles.userId, jobApplications.creatorId))
    .where(
      and(eq(jobApplications.jobId, jobId), eq(jobApplications.status, "hired"))
    );

  if (hired.length === 0) {
    return NextResponse.json(
      { error: "Hire at least one applicant before starting the project." },
      { status: 400 }
    );
  }

  // Create project + add members in one logical operation. Drizzle's neon-http
  // driver doesn't expose a transaction wrapper, so we run sequentially and
  // back-link the projectId to the job last; if anything below the project
  // insert fails, the orphan project is small overhead.
  const [project] = await db
    .insert(projects)
    .values({
      title: job.title,
      description: job.description ?? null,
      status: "active",
    })
    .returning({ id: projects.id });

  const memberRows: { projectId: string; userId: string; roleLabel: string }[] = [
    { projectId: project.id, userId: job.clientId, roleLabel: "Client" },
  ];
  for (const h of hired) {
    if (h.creatorId === job.clientId) continue;
    const first = h.specialties?.[0];
    const label = first
      ? first
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "Creator";
    memberRows.push({
      projectId: project.id,
      userId: h.creatorId,
      roleLabel: label,
    });
  }
  await db.insert(projectMembers).values(memberRows);

  // Link the project back to the job so future visits route to it.
  await db
    .update(jobs)
    .set({ projectId: project.id, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  // Conversation transition. The /api/jobs/[id]/apply route opened a
  // job_application conversation between the client + each creator. Promote
  // those to a single project conversation so the chat history (pitch,
  // back-and-forth) carries forward into the project chat seamlessly.
  //
  // Strategy:
  //   1. Pick the FIRST hired application's conversation as the project's
  //      canonical chat — flip kind='project', project_id=newId, clear
  //      job_application_id.
  //   2. Add all OTHER hired creators (and the client, if missing) as
  //      participants on that conversation.
  //   3. Other hired-app conversations stay as kind='job_application' for
  //      audit; they won't show up in the inbox under "Projects" anymore.
  //   4. Post a system message announcing the project. SSE event so anyone
  //      already watching the conversation sees it live.
  const applicationIds = hired.map((h) => h.applicationId);
  const appConvs = await db
    .select({ id: conversations.id, jobApplicationId: conversations.jobApplicationId })
    .from(conversations)
    .where(
      and(
        inArray(conversations.jobApplicationId, applicationIds),
        eq(conversations.kind, "job_application")
      )
    );

  let conversationId: string | null = null;
  if (appConvs.length > 0) {
    const canonical = appConvs[0];
    conversationId = canonical.id;

    await db
      .update(conversations)
      .set({
        kind: "project",
        projectId: project.id,
        jobApplicationId: null,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, canonical.id));

    // Add hired creators (other than the canonical app's creator) + client
    // to the conversation. ON CONFLICT skip — original participants already there.
    const allMemberIds = [job.clientId, ...hired.map((h) => h.creatorId)];
    for (const userId of allMemberIds) {
      await db
        .insert(conversationParticipants)
        .values({ conversationId: canonical.id, userId })
        .onConflictDoNothing();
    }

    await db.insert(messages).values({
      conversationId: canonical.id,
      projectId: project.id,
      senderId: null,
      content: "Project started — you've been added to the team.",
      messageType: "system",
    });

    publishConversationEvent({
      type: "kind_changed",
      kind: "project",
      projectId: project.id,
      conversationId: canonical.id,
    });
  } else {
    // No prior conversation (shouldn't happen post-migration, but be safe):
    // create a fresh project conversation with the same membership we just
    // wrote to project_members.
    const [created] = await db
      .insert(conversations)
      .values({ kind: "project", projectId: project.id })
      .returning({ id: conversations.id });
    conversationId = created.id;
    const allMemberIds = [job.clientId, ...hired.map((h) => h.creatorId)];
    for (const userId of allMemberIds) {
      await db
        .insert(conversationParticipants)
        .values({ conversationId: created.id, userId })
        .onConflictDoNothing();
    }
  }

  return NextResponse.json({
    id: project.id,
    conversationId,
    alreadyExisted: false,
  });
}
