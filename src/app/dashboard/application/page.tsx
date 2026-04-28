import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/role-guard";
import { db } from "@/db";
import { applications, coderProfiles, jobApplications, jobs } from "@/db/schema";
import ApplicationStatusClient from "./ApplicationStatusClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ApplicationPage() {
  const { id } = await requireRole(["coder"]);

  // Most recent application + the linked coderProfile status. Both surfaces
  // are useful: applications.status tracks the vetting workflow,
  // coderProfiles.status flips to "active" + verifiedAt is stamped when
  // admin approval lands.
  const [latestApp] = await db
    .select({
      id: applications.id,
      status: applications.status,
      reviewerNotes: applications.reviewerNotes,
      createdAt: applications.createdAt,
      reviewedAt: applications.reviewedAt,
    })
    .from(applications)
    .where(eq(applications.userId, id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  const [profile] = await db
    .select({
      status: coderProfiles.status,
      verifiedAt: coderProfiles.verifiedAt,
    })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, id))
    .limit(1);

  // Job applications by this creator (separate from the vetting application
  // above). Each row joins to the parent job for title + status display.
  const jobApps = await db
    .select({
      applicationId: jobApplications.id,
      jobId: jobApplications.jobId,
      status: jobApplications.status,
      pitch: jobApplications.pitch,
      createdAt: jobApplications.createdAt,
      jobTitle: jobs.title,
      jobStatus: jobs.status,
      jobBudget: jobs.budgetRange,
      jobProjectType: jobs.projectType,
    })
    .from(jobApplications)
    .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
    .where(eq(jobApplications.creatorId, id))
    .orderBy(desc(jobApplications.createdAt));

  return (
    <ApplicationStatusClient
      application={
        latestApp
          ? {
              id: latestApp.id,
              status: latestApp.status ?? "applied",
              reviewerNotes: latestApp.reviewerNotes,
              createdAt: latestApp.createdAt.toISOString(),
              reviewedAt: latestApp.reviewedAt?.toISOString() ?? null,
            }
          : null
      }
      profileVerified={!!profile?.verifiedAt}
      profileStatus={profile?.status ?? null}
      jobApplications={jobApps.map((j) => ({
        applicationId: j.applicationId,
        jobId: j.jobId,
        status: j.status,
        pitch: j.pitch,
        createdAt: j.createdAt.toISOString(),
        jobTitle: j.jobTitle,
        jobStatus: j.jobStatus,
        jobBudget: j.jobBudget,
        jobProjectType: j.jobProjectType,
      }))}
    />
  );
}
