import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, users, projects, projectMembers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get distinct projects where user is a member, with their latest message
  const latestMessages = db
    .select({
      projectId: messages.projectId,
      latestAt: sql<Date>`max(${messages.createdAt})`.as("latest_at"),
    })
    .from(messages)
    .groupBy(messages.projectId)
    .as("latest_messages");

  const rows = await db
    .select({
      projectId: projects.id,
      projectName: projects.title,
      projectStatus: projects.status,
      lastMessageContent: messages.content,
      lastMessageType: messages.messageType,
      lastMessageAt: messages.createdAt,
      lastSenderName: users.name,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .innerJoin(
      latestMessages,
      eq(projects.id, latestMessages.projectId)
    )
    .innerJoin(
      messages,
      sql`${messages.projectId} = ${latestMessages.projectId} AND ${messages.createdAt} = ${latestMessages.latestAt}`
    )
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(projectMembers.userId, userId))
    .orderBy(desc(messages.createdAt));

  const conversations = rows.map((row) => ({
    projectId: row.projectId,
    projectName: row.projectName,
    lastMessage:
      row.lastMessageType === "file"
        ? "Shared a file"
        : row.lastMessageContent || "",
    lastSenderName: row.lastSenderName || "System",
    lastMessageAt: row.lastMessageAt,
    status: row.projectStatus,
  }));

  return Response.json(conversations);
}
