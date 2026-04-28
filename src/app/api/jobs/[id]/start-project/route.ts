import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  jobs,
  jobApplications,
  projects,
  projectMembers,
  coderProfiles,
} from "@/db/schema";

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
  // specialty to seed a roleLabel.
  const hired = await db
    .select({
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

  return NextResponse.json({ id: project.id, alreadyExisted: false });
}
