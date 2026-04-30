import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  messages,
  users,
  projectMembers,
  conversations,
  invoices,
} from "@/db/schema";
import { eq, and, desc, lt, inArray } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";
import { publishConversationEvent } from "@/lib/conversation-bus";

const messagePostSchema = z
  .object({
    projectId: z.string().uuid(),
    content: z.string().min(1).max(10_000),
    messageType: z
      .enum(["text", "file", "system", "ai"])
      .optional(),
    fileUrl: z.string().url().max(2048).nullable().optional(),
  })
  .strict();

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

  // Pagination: ?limit=N (default 50, cap 100) and ?cursor=<messageId>
  // Cursor semantics: return messages created strictly before the cursor
  // message's createdAt. Ordering is DESC (newest first).
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
  const cursor = searchParams.get("cursor");

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

  // If a cursor was supplied, fetch that message's createdAt to anchor the
  // window. Missing/invalid cursors degrade gracefully (ignored).
  let cursorAt: Date | null = null;
  if (cursor) {
    const [cursorMsg] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, cursor))
      .limit(1);
    if (cursorMsg) cursorAt = cursorMsg.createdAt;
  }

  const where = cursorAt
    ? and(eq(messages.projectId, projectId), lt(messages.createdAt, cursorAt))
    : eq(messages.projectId, projectId);

  const rows = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      invoiceId: messages.invoiceId,
      createdAt: messages.createdAt,
      senderName: users.name,
      conversationId: messages.conversationId,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Hydrate invoice rows in a single query (replaces the old fragile
  // text-parsing of the message body in ProjectChat).
  const invoiceIds = rows
    .map((r) => r.invoiceId)
    .filter((x): x is string => !!x);
  type InvoiceLite = {
    id: string;
    description: string;
    amountCents: number;
    status: string;
    dueDate: Date | null;
    paidAt: Date | null;
    paymentUrl: string | null;
    senderId: string | null;
    recipientId: string | null;
  };
  const invoiceMap = new Map<string, InvoiceLite>();
  if (invoiceIds.length > 0) {
    const invs = await db
      .select({
        id: invoices.id,
        description: invoices.description,
        amountCents: invoices.amountCents,
        status: invoices.status,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        paymentUrl: invoices.paymentUrl,
        senderId: invoices.senderId,
        recipientId: invoices.recipientId,
      })
      .from(invoices)
      .where(inArray(invoices.id, invoiceIds));
    for (const i of invs) invoiceMap.set(i.id, i);
  }
  // We fetched DESC (newest first) so cursor pagination can grab the most
  // recent N efficiently against the (conversation_id, created_at DESC)
  // index. The chat UI expects ASC (oldest first → newest at the bottom),
  // so reverse before serializing. Without this, ProjectChat renders the
  // newest message at the TOP of the feed — exactly the bug you saw.
  const hydrated = rows
    .map((r) => ({
      ...r,
      invoice: r.invoiceId ? invoiceMap.get(r.invoiceId) ?? null : null,
    }))
    .reverse();

  // Expose the project's conversationId via a response header so chat UI
  // can subscribe to the new SSE stream without changing the array body
  // shape that existing callers depend on.
  const [projectConv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.projectId, projectId),
        eq(conversations.kind, "project")
      )
    )
    .limit(1);

  return Response.json(hydrated, {
    headers: projectConv?.id
      ? { "X-Conversation-Id": projectConv.id }
      : undefined,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(messagePostSchema, rawBody);
  if (!parsed.ok) {
    return Response.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { projectId, content, messageType, fileUrl } = parsed.data;

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

  // Resolve the project's conversation so we can stamp conversationId
  // (powers the new SSE stream) AND fan out a `message` event for any
  // listeners already on the new API.
  const [projectConv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.projectId, projectId),
        eq(conversations.kind, "project")
      )
    )
    .limit(1);
  const conversationId = projectConv?.id ?? null;

  const [created] = await db
    .insert(messages)
    .values({
      projectId,
      conversationId,
      senderId: session.user.id,
      content,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
    })
    .returning();

  if (conversationId) {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    publishConversationEvent({
      type: "message",
      messageId: created.id,
      conversationId,
    });
  }

  return Response.json({
    ...created,
    senderName: session.user.name || "Unknown",
  });
}
