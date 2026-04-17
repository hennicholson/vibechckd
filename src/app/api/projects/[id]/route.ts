import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, users, coderProfiles, messages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // SECURITY: Verify the requesting user is a member of this project
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get project members with user details
    const members = await db
      .select({
        roleLabel: projectMembers.roleLabel,
        userId: projectMembers.userId,
        userName: users.name,
        userImage: users.image,
        slug: coderProfiles.creatorSlug,
        pfpUrl: coderProfiles.pfpUrl,
        specialties: coderProfiles.specialties,
        verified: coderProfiles.verifiedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .leftJoin(coderProfiles, eq(coderProfiles.userId, users.id))
      .where(eq(projectMembers.projectId, id));

    return NextResponse.json({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      tags: project.tags || [],
      budget: project.budget,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      createdAt: project.createdAt?.toISOString(),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.userName || "Unknown",
        role: m.roleLabel,
        avatarUrl: m.pfpUrl || "",
        slug: m.slug || "",
        specialties: m.specialties || [],
        verified: !!m.verified,
      })),
    });
  } catch (error) {
    console.error("Project fetch error:", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
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

    const { id } = await params;
    const body = await req.json();

    // Verify membership
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get current project for change detection
    const [current] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) updates.status = body.status;
    if (body.description !== undefined) updates.description = body.description;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.budget !== undefined) updates.budget = body.budget;
    if (body.startDate !== undefined) updates.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    // Get user name for system messages
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const userName = user?.name || "Someone";

    // Post system messages for notable changes
    const changes: string[] = [];
    if (body.title !== undefined && current && body.title !== current.title) {
      changes.push(`renamed the project to "${body.title}"`);
    }
    if (body.status !== undefined && current && body.status !== current.status) {
      changes.push(`changed the status to ${body.status}`);
    }
    if (body.description !== undefined && current && body.description !== current.description) {
      changes.push("updated the project description");
    }
    // Tags are private/organizational -- no chat notification

    if (changes.length > 0) {
      await db.insert(messages).values({
        projectId: id,
        senderId: null,
        content: `${userName} ${changes.join(" and ")}`,
        messageType: "system",
      });
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      tags: updated.tags,
    });
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify membership
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only allow deleting draft projects
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (project?.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft projects can be deleted" },
        { status: 400 }
      );
    }

    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
