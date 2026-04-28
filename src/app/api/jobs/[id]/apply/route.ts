import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  jobs,
  jobApplications,
  coderProfiles,
  users,
  directMessageThreads,
  directMessageParticipants,
  directMessages,
} from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

// Find an existing 1:1 DM thread between two users (a thread that has
// EXACTLY these two participants, no more), or create a new one and add
// them. Returns the threadId.
async function findOrCreateThread(userA: string, userB: string): Promise<string> {
  // Threads that contain BOTH users…
  const candidate = await db.execute<{ thread_id: string }>(sql`
    SELECT thread_id FROM direct_message_participants
    WHERE user_id IN (${userA}, ${userB})
    GROUP BY thread_id
    HAVING COUNT(DISTINCT user_id) = 2
  `);
  // …filter to threads with exactly 2 participants total.
  for (const row of candidate as unknown as { thread_id: string }[]) {
    const counted = await db.execute<{ n: number }>(sql`
      SELECT COUNT(*)::int AS n FROM direct_message_participants
      WHERE thread_id = ${row.thread_id}
    `);
    const total = (counted as unknown as { n: number }[])[0]?.n ?? 0;
    if (total === 2) return row.thread_id;
  }
  // Create a new thread + add both participants.
  const [thread] = await db
    .insert(directMessageThreads)
    .values({})
    .returning({ id: directMessageThreads.id });
  await db.insert(directMessageParticipants).values([
    { threadId: thread.id, userId: userA },
    { threadId: thread.id, userId: userB },
  ]);
  return thread.id;
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

  // Open (or reuse) a 1:1 DM thread between client and creator + post a
  // system-style message announcing the application. Both parties see
  // this in /dashboard/inbox via the existing direct-message UI.
  // Failures here are non-fatal — the application itself is the source
  // of truth for the apply action.
  try {
    const [creator] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const creatorName = creator?.name || "A creator";
    const threadId = await findOrCreateThread(job.clientId, session.user.id);
    const lines = [
      `${creatorName} applied to your job: "${job.title}".`,
      pitch ? `\nTheir pitch:\n${pitch}` : null,
    ].filter(Boolean);
    await db.insert(directMessages).values({
      threadId,
      senderId: session.user.id,
      content: lines.join(""),
      messageType: "system",
    });
  } catch {
    // swallow — application created successfully regardless
  }

  return NextResponse.json({ success: true, applicationId: created.id, updated: false });
}
