import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages, users } from "@/db/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const url = new URL(req.url);
    const includeCompleted = url.searchParams.get("includeCompleted") === "true";

    // Subquery: member count per project
    const memberCounts = db
      .select({
        projectId: projectMembers.projectId,
        count: sql<number>`count(*)::int`.as("member_count"),
      })
      .from(projectMembers)
      .groupBy(projectMembers.projectId)
      .as("member_counts");

    // Subquery: latest message timestamp per project
    const latestMsg = db
      .select({
        projectId: messages.projectId,
        latestAt: sql<Date>`max(${messages.createdAt})`.as("latest_at"),
      })
      .from(messages)
      .groupBy(messages.projectId)
      .as("latest_msg");

    // Build where clause
    const conditions = [eq(projectMembers.userId, userId)];
    if (!includeCompleted) {
      conditions.push(ne(projects.status, "completed"));
      conditions.push(ne(projects.status, "cancelled"));
    }

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: memberCounts.count,
        lastActivity: latestMsg.latestAt,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .leftJoin(memberCounts, eq(projects.id, memberCounts.projectId))
      .leftJoin(latestMsg, eq(projects.id, latestMsg.projectId))
      .where(and(...conditions))
      .orderBy(desc(sql`coalesce(${latestMsg.latestAt}, ${projects.updatedAt})`));

    const result = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      status: r.status,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
      memberCount: r.memberCount || 1,
      lastActivity: r.lastActivity
        ? new Date(r.lastActivity).toISOString()
        : r.updatedAt?.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Projects list error:", error);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, members } = body as {
      title: string;
      description?: string;
      members?: { userId: string; roleLabel: string }[];
    };

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create the project
    const [project] = await db
      .insert(projects)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        status: "active",
      })
      .returning();

    // Add the current user as "client"
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      roleLabel: "Client",
    });

    // Add additional members if provided
    if (members && Array.isArray(members)) {
      const memberInserts = members
        .filter((m) => m.userId && m.userId !== session.user.id)
        .map((m) => ({
          projectId: project.id,
          userId: m.userId,
          roleLabel: m.roleLabel || "Member",
        }));

      if (memberInserts.length > 0) {
        await db.insert(projectMembers).values(memberInserts);
      }
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
    });
  } catch (error) {
    console.error("Project create error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
