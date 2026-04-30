import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  conversations,
  conversationParticipants,
  messages,
  users,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";
import { publishConversationEvent } from "@/lib/conversation-bus";
import { notifyWhopUsers } from "@/lib/whop-notifications";

// Thin shim — preserves the pre-unification request/response shape so
// existing inbox UI keeps working unchanged, but reads/writes against
// the unified `conversations` + `messages` tables. The 0012 backfill
// kept threadId == conversationId for legacy DM threads, so callers
// don't need to change ID semantics. Will be retired once the frontend
// migrates to /api/conversations/[id]/messages.

const dmPostSchema = z
  .object({
    threadId: z.string().uuid(),
    content: z.string().min(1).max(5000),
    messageType: z.enum(["text", "file", "system", "ai"]).optional(),
    fileUrl: z.string().url().max(2048).nullable().optional(),
  })
  .strict();

async function isMember(userId: string, conversationId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    )
    .limit(1);
  return !!row;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  if (!threadId) {
    return Response.json({ error: "threadId is required" }, { status: 400 });
  }

  if (!(await isMember(session.user.id, threadId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      senderName: users.name,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, threadId))
    .orderBy(asc(messages.createdAt));

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(dmPostSchema, rawBody);
  if (!parsed.ok) {
    return Response.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { threadId, content, messageType, fileUrl } = parsed.data;

  if (!(await isMember(session.user.id, threadId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [created] = await db
    .insert(messages)
    .values({
      conversationId: threadId,
      senderId: session.user.id,
      content,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
    })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, threadId));

  publishConversationEvent({
    type: "message",
    messageId: created.id,
    conversationId: threadId,
  });

  // Whop push fan-out (fire-and-forget). Mirrors the new conversations API.
  const senderName = session.user.name ?? "Someone";
  const senderUserId = session.user.id;
  void (async () => {
    try {
      const peers = await db
        .select({ whopUserId: users.whopUserId })
        .from(conversationParticipants)
        .innerJoin(users, eq(users.id, conversationParticipants.userId))
        .where(eq(conversationParticipants.conversationId, threadId));
      const recipientWhopIds = peers
        .filter((p) => !!p.whopUserId)
        .map((p) => p.whopUserId as string);
      if (recipientWhopIds.length === 0) return;
      const preview =
        messageType === "file"
          ? `${senderName} shared a file`
          : content.slice(0, 140);
      const [me] = await db
        .select({ whopUserId: users.whopUserId })
        .from(users)
        .where(eq(users.id, senderUserId))
        .limit(1);
      await notifyWhopUsers({
        whopUserIds: recipientWhopIds,
        title: `Message: ${senderName}`,
        content: preview,
        iconWhopUserId: me?.whopUserId ?? null,
        deepLinkPath: `/dashboard/inbox?c=${threadId}`,
      });
    } catch {
      // swallowed internally
    }
  })();

  return Response.json({
    ...created,
    senderName: session.user.name || "Unknown",
  });
}
