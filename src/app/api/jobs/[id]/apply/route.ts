import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  jobs,
  jobApplications,
  coderProfiles,
  users,
  conversations,
  conversationParticipants,
  messages,
} from "@/db/schema";
import { parseBody, z } from "@/lib/validation";
import { publishConversationEvent } from "@/lib/conversation-bus";

// Find or create the job_application conversation between client + creator
// for a given application id. We tie the conversation to the application
// (not the job) so when the client clicks "Start project," start-project
// can transition this exact conversation in place to kind='project'.
async function findOrCreateAppConversation(
  applicationId: string,
  clientId: string,
  creatorId: string
): Promise<string> {
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.jobApplicationId, applicationId),
        eq(conversations.kind, "job_application")
      )
    )
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(conversations)
    .values({ kind: "job_application", jobApplicationId: applicationId })
    .returning({ id: conversations.id });
  await db.insert(conversationParticipants).values([
    { conversationId: created.id, userId: clientId },
    { conversationId: created.id, userId: creatorId },
  ]);
  return created.id;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const applySchema = z
  .object({
    pitch: z.string().trim().max(2000).optional(),
  })
  .strict();

// POST /api/jobs/[id]/apply — verified creator applies to a job.
// One-click: their existing coderProfile is what the client sees on the
// applicants list (joined server-side). The optional `pitch` is a short
// note. Idempotent — re-posting just updates the pitch.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "coder" && role !== "admin") {
    return NextResponse.json({ error: "Only creators can apply" }, { status: 403 });
  }

  const [profile] = await db
    .select({ status: coderProfiles.status })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);
  if (!profile || profile.status !== "active") {
    return NextResponse.json(
      {
        error:
          "Only verified creators can apply. Finish your /apply application first.",
      },
      { status: 403 }
    );
  }

  const { id: jobId } = await ctx.params;
  const [job] = await db
    .select({
      id: jobs.id,
      status: jobs.status,
      clientId: jobs.clientId,
      title: jobs.title,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "open") {
    return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseBody(applySchema, body ?? {});
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const pitch = parsed.data.pitch?.length ? parsed.data.pitch : null;

  const [existing] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.jobId, jobId),
        eq(jobApplications.creatorId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(jobApplications)
      .set({ pitch, updatedAt: new Date() })
      .where(eq(jobApplications.id, existing.id));
    return NextResponse.json({ success: true, applicationId: existing.id, updated: true });
  }

  const [created] = await db
    .insert(jobApplications)
    .values({
      jobId,
      creatorId: session.user.id,
      pitch,
      status: "applied",
    })
    .returning({ id: jobApplications.id });

  // Open (or reuse) the job_application conversation between client and
  // creator + post a system message announcing the application. Both parties
  // see this in /dashboard/inbox under the unified conversations list. When
  // the client clicks "Start project," start-project will flip this same
  // conversation to kind='project' — preserving full history.
  // Failures here are non-fatal — the application is the source of truth.
  try {
    const [creator] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const creatorName = creator?.name || "A creator";
    const conversationId = await findOrCreateAppConversation(
      created.id,
      job.clientId,
      session.user.id
    );
    const lines = [
      `${creatorName} applied to your job: "${job.title}".`,
      pitch ? `\nTheir pitch:\n${pitch}` : null,
    ].filter(Boolean);
    const [systemMsg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: session.user.id,
        content: lines.join(""),
        messageType: "system",
      })
      .returning({ id: messages.id });
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    publishConversationEvent({
      type: "message",
      messageId: systemMsg.id,
      conversationId,
    });
  } catch {
    // swallow — application created successfully regardless
  }

  return NextResponse.json({ success: true, applicationId: created.id, updated: false });
}
