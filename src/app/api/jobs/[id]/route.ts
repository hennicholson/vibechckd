import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { jobs, jobApplications, users, coderProfiles } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/jobs/[id]
//   - Client (owner): full job + applicant list (joined with users + coderProfiles)
//   - Verified creator: full job + applied state
//   - Else: 404 (don't leak existence)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const isOwner = job.clientId === session.user.id;

  if (isOwner) {
    const applicants = await db
      .select({
        applicationId: jobApplications.id,
        creatorId: jobApplications.creatorId,
        creatorName: users.name,
        creatorAvatar: users.image,
        creatorSlug: coderProfiles.creatorSlug,
        creatorTagline: coderProfiles.tagline,
        creatorRate: coderProfiles.hourlyRate,
        creatorSpecialties: coderProfiles.specialties,
        pitch: jobApplications.pitch,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
      })
      .from(jobApplications)
      .innerJoin(users, eq(users.id, jobApplications.creatorId))
      .leftJoin(coderProfiles, eq(coderProfiles.userId, jobApplications.creatorId))
      .where(eq(jobApplications.jobId, id))
      .orderBy(desc(jobApplications.createdAt));
    return NextResponse.json({ job, applicants, viewerRole: "owner" });
  }

  if (role === "coder" || role === "admin") {
    if (job.status !== "open" && role === "coder") {
      // Closed/filled jobs are only visible to the owner. Hide otherwise.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [profile] = await db
      .select({ status: coderProfiles.status })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, session.user.id))
      .limit(1);
    const applyEligible = profile?.status === "active";

    const [existing] = await db
      .select({ id: jobApplications.id, status: jobApplications.status })
      .from(jobApplications)
      .where(
        and(
          eq(jobApplications.jobId, id),
          eq(jobApplications.creatorId, session.user.id)
        )
      )
      .limit(1);

    return NextResponse.json({
      job,
      viewerRole: "creator",
      applyEligible,
      application: existing ?? null,
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

const patchSchema = z
  .object({
    status: z.enum(["open", "closed", "filled"]).optional(),
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(5000).optional(),
    projectType: z.string().trim().max(60).optional(),
    budgetRange: z.string().trim().max(60).optional(),
    timeline: z.string().trim().max(60).optional(),
  })
  .strict();

// PATCH /api/jobs/[id] — owner-only edit.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const [job] = await db.select({ clientId: jobs.clientId }).from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job || job.clientId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = parseBody(patchSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) patch[k] = v;
  }
  await db.update(jobs).set(patch).where(eq(jobs.id, id));
  return NextResponse.json({ success: true });
}
