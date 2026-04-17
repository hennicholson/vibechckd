import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  directMessageThreads,
  directMessageParticipants,
  directMessages,
  users,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return Response.json(
      { error: "threadId is required" },
      { status: 400 }
    );
  }

  // Verify user is a participant of this thread
  const [participation] = await db
    .select()
    .from(directMessageParticipants)
    .where(
      and(
        eq(directMessageParticipants.threadId, threadId),
        eq(directMessageParticipants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participation) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: directMessages.id,
      senderId: directMessages.senderId,
      senderName: users.name,
      content: directMessages.content,
      messageType: directMessages.messageType,
      fileUrl: directMessages.fileUrl,
      createdAt: directMessages.createdAt,
    })
    .from(directMessages)
    .leftJoin(users, eq(directMessages.senderId, users.id))
    .where(eq(directMessages.threadId, threadId))
    .orderBy(asc(directMessages.createdAt));

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { threadId, content, messageType, fileUrl } = body;

  if (!threadId || !content) {
    return Response.json(
      { error: "threadId and content are required" },
      { status: 400 }
    );
  }

  // Verify user is a participant of this thread
  const [participation] = await db
    .select()
    .from(directMessageParticipants)
    .where(
      and(
        eq(directMessageParticipants.threadId, threadId),
        eq(directMessageParticipants.userId, session.user.id)
      )
    )
    .limit(1);

  if (!participation) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Insert the message
  const [created] = await db
    .insert(directMessages)
    .values({
      threadId,
      senderId: session.user.id,
      content,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
    })
    .returning();

  // Update thread's updatedAt
  await db
    .update(directMessageThreads)
    .set({ updatedAt: new Date() })
    .where(eq(directMessageThreads.id, threadId));

  return Response.json({
    ...created,
    senderName: session.user.name || "Unknown",
  });
}
