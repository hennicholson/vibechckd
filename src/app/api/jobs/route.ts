import { NextResponse } from "next/server";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { jobs, jobApplications, coderProfiles } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(5000).optional(),
    projectType: z.string().trim().max(60).optional(),
    budgetRange: z.string().trim().max(60).optional(),
    timeline: z.string().trim().max(60).optional(),
  })
  .strict();

// POST /api/jobs — client posts a new job. Auth + role gate.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "client") {
    return NextResponse.json({ error: "Only clients can post jobs" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseBody(jobSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { title, description, projectType, budgetRange, timeline } = parsed.data;
  const [created] = await db
    .insert(jobs)
    .values({
      clientId: session.user.id,
      title,
      description: description ?? null,
      projectType: projectType ?? null,
      budgetRange: budgetRange ?? null,
      timeline: timeline ?? null,
      status: "open",
    })
    .returning({ id: jobs.id });
  return NextResponse.json({ success: true, id: created.id });
}

// GET /api/jobs — role-aware:
//   - client: own jobs + applicant counts
//   - verified creator: list of open jobs + has-applied flag
//   - else: 403
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;

  if (role === "client") {
    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        projectType: jobs.projectType,
        budgetRange: jobs.budgetRange,
        timeline: jobs.timeline,
        status: jobs.status,
        createdAt: jobs.createdAt,
        applicantCount: sql<number>`COUNT(${jobApplications.id})::int`.as("applicant_count"),
      })
      .from(jobs)
      .leftJoin(jobApplications, eq(jobApplications.jobId, jobs.id))
      .where(eq(jobs.clientId, session.user.id))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt));
    return NextResponse.json({ jobs: rows });
  }

  // creator (or admin) — show only open jobs, but only verified creators
  // can actually apply. We let admins see the listing too.
  if (role === "coder" || role === "admin") {
    // Verify the creator has an active profile if applying — for the
    // list view we surface an `applyEligible` flag so the UI can prompt
    // them to finish their /apply if needed.
    const [profile] = await db
      .select({ status: coderProfiles.status })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, session.user.id))
      .limit(1);
    const applyEligible = profile?.status === "active";

    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        projectType: jobs.projectType,
        budgetRange: jobs.budgetRange,
        timeline: jobs.timeline,
        status: jobs.status,
        createdAt: jobs.createdAt,
        // 1 if the current creator already applied to this job
        appliedFlag: sql<number>`COUNT(${jobApplications.id})::int`.as("applied_flag"),
      })
      .from(jobs)
      .leftJoin(
        jobApplications,
        and(
          eq(jobApplications.jobId, jobs.id),
          eq(jobApplications.creatorId, session.user.id)
        )
      )
      .where(eq(jobs.status, "open"))
      .groupBy(jobs.id)
      .orderBy(desc(jobs.createdAt));

    return NextResponse.json({
      jobs: rows.map((r) => ({
        ...r,
        applied: r.appliedFlag > 0,
      })),
      applyEligible,
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
