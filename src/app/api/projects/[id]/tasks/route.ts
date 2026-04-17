import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, projectMembers, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

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
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        dueDate: tasks.dueDate,
        sortOrder: tasks.sortOrder,
        assignedTo: tasks.assignedTo,
        assigneeName: users.name,
        assigneeImage: users.image,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

    const result = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      status: r.status,
      dueDate: r.dueDate?.toISOString() || null,
      assigneeId: r.assignedTo || "",
      assigneeName: r.assigneeName || "",
      assigneeImage: r.assigneeImage || "",
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load tasks" },
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
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // SECURITY: Verify requesting user is a member of this project
    const [taskMembership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!taskMembership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        projectId,
        title: title.trim(),
        status: "todo",
      })
      .returning();

    return NextResponse.json({
      id: newTask.id,
      title: newTask.title,
      description: "",
      status: newTask.status,
      dueDate: newTask.dueDate?.toISOString() || null,
      assigneeId: "",
      assigneeName: "",
      assigneeImage: "",
    });
  } catch (error) {
    console.error("Task create error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
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
    const { taskId, status, title, assignedTo } = body;

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "taskId is required" },
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

    // Build update payload
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch assignee info if assigned
    let assigneeName = "";
    let assigneeImage = "";
    if (updated.assignedTo) {
      const [assignee] = await db
        .select({ name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, updated.assignedTo))
        .limit(1);
      if (assignee) {
        assigneeName = assignee.name || "";
        assigneeImage = assignee.image || "";
      }
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description || "",
      status: updated.status,
      dueDate: updated.dueDate?.toISOString() || null,
      assigneeId: updated.assignedTo || "",
      assigneeName,
      assigneeImage,
    });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
