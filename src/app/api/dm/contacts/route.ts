import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, projectMembers, coderProfiles } from "@/db/schema";
import { eq, ne, and, inArray, sql } from "drizzle-orm";

/**
 * DM Contact Rules:
 * - Clients can DM any creator (not other clients)
 * - Creators can DM other creators + any client they've worked with
 * - "Worked with" = shared a project via projectMembers
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get current user's role
    const [currentUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const isClient = currentUser.role === "client";

    // Get users the current user has shared projects with
    const sharedProjectUserIds = db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        inArray(
          projectMembers.projectId,
          db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(eq(projectMembers.userId, userId))
        )
      );

    let contacts;

    if (isClient) {
      // Clients can message any creator (coder or admin role)
      contacts = await db
        .select({
          userId: users.id,
          name: users.name,
          image: users.image,
          role: users.role,
          avatarUrl: coderProfiles.pfpUrl,
        })
        .from(users)
        .leftJoin(coderProfiles, eq(coderProfiles.userId, users.id))
        .where(
          and(
            ne(users.id, userId),
            ne(users.role, "client")
          )
        )
        .orderBy(users.name);
    } else {
      // Creators can message:
      // 1. All other creators
      // 2. Clients they've shared a project with
      contacts = await db
        .select({
          userId: users.id,
          name: users.name,
          image: users.image,
          role: users.role,
          avatarUrl: coderProfiles.pfpUrl,
        })
        .from(users)
        .leftJoin(coderProfiles, eq(coderProfiles.userId, users.id))
        .where(
          and(
            ne(users.id, userId),
            sql`(${users.role} != 'client' OR ${users.id} IN (${sharedProjectUserIds}))`
          )
        )
        .orderBy(users.name);
    }

    const result = contacts.map((c) => ({
      userId: c.userId,
      name: c.name || "Unknown",
      image: c.avatarUrl || c.image || "",
      role: c.role === "client" ? "Client" : "Creator",
    }));

    return Response.json(result);
  } catch (error) {
    console.error("DM contacts error:", error);
    return Response.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}
