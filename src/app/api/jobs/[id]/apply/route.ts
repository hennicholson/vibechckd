import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { jobs, jobApplications, coderProfiles } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

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
    .select({ id: jobs.id, status: jobs.status })
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
  return NextResponse.json({ success: true, applicationId: created.id, updated: false });
}
