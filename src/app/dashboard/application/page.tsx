import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/role-guard";
import { db } from "@/db";
import { applications, coderProfiles } from "@/db/schema";
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
    />
  );
}
