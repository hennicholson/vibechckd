import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages, users } from "@/db/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";

const projectMemberSchema = z
  .object({
    userId: z.string().uuid(),
    roleLabel: z.string().min(1).max(100),
  })
  .strict();

const projectPostSchema = z
  .object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().max(5000).optional(),
    members: z.array(projectMemberSchema).max(50).optional(),
  })
  .strict();

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
        tags: projects.tags,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: memberCounts.count,
        lastActivity: latestMsg.latestAt,
        pinned: projectMembers.pinned,
      })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .leftJoin(memberCounts, eq(projects.id, memberCounts.projectId))
      .leftJoin(latestMsg, eq(projects.id, latestMsg.projectId))
      .where(and(...conditions))
      .orderBy(desc(sql`coalesce(${projectMembers.pinned}::int, 0)`), desc(sql`coalesce(${latestMsg.latestAt}, ${projects.updatedAt})`));

    // Deduplicate by project ID (joins can produce duplicates)
    const seen = new Set<string>();
    const result = rows
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        status: r.status,
        tags: r.tags || [],
        pinned: r.pinned || false,
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

    const rawBody = await req.json().catch(() => null);
    const parsed = parseBody(projectPostSchema, rawBody);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error },
        { status: 400 }
      );
    }
    const { title, description, members } = parsed.data;

    // Create the project
    const [project] = await db
      .insert(projects)
      .values({
        title,
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
