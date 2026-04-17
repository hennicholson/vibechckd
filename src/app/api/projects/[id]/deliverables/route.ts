import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { deliverables, projectMembers, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // SECURITY: Verify requesting user is a member of this project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        id: deliverables.id,
        title: deliverables.title,
        fileUrl: deliverables.fileUrl,
        liveUrl: deliverables.liveUrl,
        status: deliverables.status,
        submittedBy: deliverables.submittedBy,
        submitterName: users.name,
        createdAt: deliverables.createdAt,
      })
      .from(deliverables)
      .leftJoin(users, eq(deliverables.submittedBy, users.id))
      .where(eq(deliverables.projectId, projectId))
      .orderBy(desc(deliverables.createdAt));

    const result = rows.map((r) => ({
      id: r.id,
      title: r.title,
      fileUrl: r.fileUrl || null,
      liveUrl: r.liveUrl || null,
      status: r.status,
      submittedBy: r.submittedBy || null,
      submitterName: r.submitterName || "Unknown",
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Deliverables fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load deliverables" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { title, fileUrl, liveUrl } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // SECURITY: Verify requesting user is a member of this project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [newDeliverable] = await db
      .insert(deliverables)
      .values({
        projectId,
        title: title.trim(),
        fileUrl: fileUrl?.trim() || null,
        liveUrl: liveUrl?.trim() || null,
        status: "submitted",
        submittedBy: session.user.id,
      })
      .returning();

    // Fetch the submitter name for the response
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      id: newDeliverable.id,
      title: newDeliverable.title,
      fileUrl: newDeliverable.fileUrl || null,
      liveUrl: newDeliverable.liveUrl || null,
      status: newDeliverable.status,
      submittedBy: newDeliverable.submittedBy || null,
      submitterName: user?.name || "Unknown",
      createdAt: newDeliverable.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Deliverable create error:", error);
    return NextResponse.json(
      { error: "Failed to create deliverable" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();
    const { deliverableId, status, feedback } = body;

    if (!deliverableId || typeof deliverableId !== "string") {
      return NextResponse.json(
        { error: "deliverableId is required" },
        { status: 400 }
      );
    }

    if (status !== "approved" && status !== "revision_requested") {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'revision_requested'" },
        { status: 400 }
      );
    }

    // SECURITY: Verify requesting user is a member of this project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify the deliverable belongs to this project
    const [existing] = await db
      .select()
      .from(deliverables)
      .where(
        and(
          eq(deliverables.id, deliverableId),
          eq(deliverables.projectId, projectId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(deliverables)
      .set({ status })
      .where(eq(deliverables.id, deliverableId))
      .returning();

    // Fetch submitter name
    const [submitter] = updated.submittedBy
      ? await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, updated.submittedBy))
          .limit(1)
      : [{ name: "Unknown" }];

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      fileUrl: updated.fileUrl || null,
      liveUrl: updated.liveUrl || null,
      status: updated.status,
      submittedBy: updated.submittedBy || null,
      submitterName: submitter?.name || "Unknown",
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Deliverable update error:", error);
    return NextResponse.json(
      { error: "Failed to update deliverable" },
      { status: 500 }
    );
  }
}
