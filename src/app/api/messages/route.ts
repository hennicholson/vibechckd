import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, users, projectMembers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  // SECURITY: Verify the requesting user is a member of this project
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
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, content, messageType, fileUrl } = body;

  if (!projectId || !content) {
    return Response.json(
      { error: "projectId and content are required" },
      { status: 400 }
    );
  }

  // SECURITY: Verify the requesting user is a member of this project
  const [postMembership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (!postMembership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [created] = await db
    .insert(messages)
    .values({
      projectId,
      senderId: session.user.id,
      content,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
    })
    .returning();

  // Return with sender name
  return Response.json({
    ...created,
    senderName: session.user.name || "Unknown",
  });
}
