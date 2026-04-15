import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages } from "@/db/schema";
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
