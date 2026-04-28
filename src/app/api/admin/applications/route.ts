import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { applications, coderProfiles, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { emails } from "@/lib/email";
import { ensureCoderProfile } from "@/lib/whop-auth";

export async function GET() {
  try {
    // Verify admin access
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allApplications = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));

    return NextResponse.json({ applications: allApplications });
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, reviewerNotes } = body as { id: string; status: string; reviewerNotes?: string };

    if (!id || !status) {
      return NextResponse.json(
        { error: "Application ID and status are required" },
        { status: 400 }
      );
    }

    if (!["applied", "under_review", "interview", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the application status and reviewer notes
    const updateData: Record<string, unknown> = {
      status: status as "applied" | "under_review" | "interview" | "approved" | "rejected",
      reviewedAt: (status === "approved" || status === "rejected") ? new Date() : undefined,
    };
    if (reviewerNotes !== undefined) {
      updateData.reviewerNotes = reviewerNotes;
    }

    const [updatedApp] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();

    if (!updatedApp) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // When approved:
    //   1. Make sure the user's role is "coder" (they may have applied while
    //      registered as a client — register-creator path always sets coder,
    //      but a client could submit /apply too).
    //   2. Make sure a coderProfile row exists (ensureCoderProfile is
    //      idempotent — creates a draft if missing). Without this an
    //      application from an account-less submitter, or from a client who
    //      never went through any coder onboarding, would have nothing to
    //      activate.
    //   3. Activate the profile (status=active + verifiedAt).
    if (status === "approved" && updatedApp.userId) {
      await db
        .update(users)
        .set({ role: "coder" })
        .where(eq(users.id, updatedApp.userId));

      const profileId = await ensureCoderProfile(updatedApp.userId);

      await db
        .update(coderProfiles)
        .set({
          status: "active",
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(coderProfiles.id, profileId));
    }

    // When rejected, suspend the coder profile
    if (status === "rejected" && updatedApp.userId) {
      const [profile] = await db
        .select()
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, updatedApp.userId))
        .limit(1);

      if (profile) {
        await db
          .update(coderProfiles)
          .set({
            status: "suspended",
            updatedAt: new Date(),
          })
          .where(eq(coderProfiles.id, profile.id));
      }
    }

    // Fire-and-forget status notification emails
    if (status === "approved" && updatedApp.email) {
      emails.applicationApproved(updatedApp.email, updatedApp.name).catch(() => {});
    }
    if (status === "rejected" && updatedApp.email) {
      emails
        .applicationRejected(updatedApp.email, updatedApp.name, updatedApp.reviewerNotes)
        .catch(() => {});
    }

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (error) {
    console.error("Failed to update application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}
