import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  directMessageThreads,
  directMessageParticipants,
  directMessages,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all threads the current user participates in
  const myParticipations = await db
    .select({ threadId: directMessageParticipants.threadId })
    .from(directMessageParticipants)
    .where(eq(directMessageParticipants.userId, session.user.id));

  if (myParticipations.length === 0) {
    return Response.json([]);
  }

  const threadIds = myParticipations.map((p) => p.threadId);

  // For each thread, get the other participants and the last message
  const threads = await Promise.all(
    threadIds.map(async (threadId) => {
      // Get other participants with user info
      const participants = await db
        .select({
          userId: users.id,
          name: users.name,
          image: users.image,
        })
        .from(directMessageParticipants)
        .innerJoin(users, eq(directMessageParticipants.userId, users.id))
        .where(
          and(
            eq(directMessageParticipants.threadId, threadId),
            sql`${directMessageParticipants.userId} != ${session.user.id}`
          )
        );

      // Get last message
      const [lastMsg] = await db
        .select({
          content: directMessages.content,
          createdAt: directMessages.createdAt,
          senderId: directMessages.senderId,
        })
        .from(directMessages)
        .where(eq(directMessages.threadId, threadId))
        .orderBy(desc(directMessages.createdAt))
        .limit(1);

      return {
        threadId,
        participants,
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.createdAt || null,
      };
    })
  );

  // Sort by last message time descending (threads with no messages go last)
  threads.sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) return 0;
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });

  return Response.json(threads);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { recipientId } = body;

  if (!recipientId) {
    return Response.json(
      { error: "recipientId is required" },
      { status: 400 }
    );
  }

  if (recipientId === session.user.id) {
    return Response.json(
      { error: "Cannot create a DM thread with yourself" },
      { status: 400 }
    );
  }

  // Check if a thread already exists between these two users
  // Find threads where both users are participants
  const myThreads = await db
    .select({ threadId: directMessageParticipants.threadId })
    .from(directMessageParticipants)
    .where(eq(directMessageParticipants.userId, session.user.id));

  for (const { threadId } of myThreads) {
    const [recipientParticipation] = await db
      .select()
      .from(directMessageParticipants)
      .where(
        and(
          eq(directMessageParticipants.threadId, threadId),
          eq(directMessageParticipants.userId, recipientId)
        )
      )
      .limit(1);

    if (recipientParticipation) {
      return Response.json({ threadId });
    }
  }

  // No existing thread found — create a new one
  const [thread] = await db
    .insert(directMessageThreads)
    .values({})
    .returning();

  await db.insert(directMessageParticipants).values([
    { threadId: thread.id, userId: session.user.id },
    { threadId: thread.id, userId: recipientId },
  ]);

  return Response.json({ threadId: thread.id });
}
