import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { jobs, jobApplications } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    status: z.enum(["applied", "shortlisted", "rejected", "hired"]),
  })
  .strict();

// PATCH /api/jobs/[id]/applications/[appId] — owner-only.
// Updates the application's status. On `hired`, flips the parent job to
// `filled` so it disappears from the public board.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; appId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: jobId, appId } = await ctx.params;

  // Verify the caller owns the parent job.
  const [job] = await db
    .select({ id: jobs.id, clientId: jobs.clientId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  if (!job || job.clientId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify the application is in fact for this job.
  const [app] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(and(eq(jobApplications.id, appId), eq(jobApplications.jobId, jobId)))
    .limit(1);
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(patchSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { status } = parsed.data;

  await db
    .update(jobApplications)
    .set({ status, updatedAt: new Date() })
    .where(eq(jobApplications.id, appId));

  // When the client hires someone, mark the job filled. Other applicants
  // remain in their last status (so the client can see who applied).
  if (status === "hired") {
    await db
      .update(jobs)
      .set({ status: "filled", updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
  }

  return NextResponse.json({ success: true });
}
