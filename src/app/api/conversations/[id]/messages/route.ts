import { NextResponse } from "next/server";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  messages,
  users,
  conversations,
  conversationParticipants,
  invoices,
} from "@/db/schema";
import { isConversationMember } from "@/lib/conversation-access";
import { publishConversationEvent } from "@/lib/conversation-bus";
import { notifyWhopUsers } from "@/lib/whop-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sendSchema = z.object({
  content: z.string().min(1).max(8000),
  messageType: z.enum(["text", "file", "system", "ai", "invoice"]).default("text"),
  fileUrl: z.string().url().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
});

// GET messages in a conversation. Cursor pagination on (created_at, id) so
// the inbox can scroll back into history without skipping rows that share
// a millisecond timestamp.
//   ?limit=50            (max 100)
//   ?cursor=<iso8601>    (return rows older than this; default = newest)
//
// Returns rows in ASC order so the client can append to its existing feed
// without reversing.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: conversationId } = await ctx.params;
  if (!(await isConversationMember(session.user.id, conversationId))) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);
  const cursor = url.searchParams.get("cursor");

  const baseFilter = cursor
    ? and(
        eq(messages.conversationId, conversationId),
        lt(messages.createdAt, new Date(cursor))
      )
    : eq(messages.conversationId, conversationId);

  // Fetch newest first via the index, then reverse to ASC for the client.
  const rowsDesc = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      invoiceId: messages.invoiceId,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderImage: users.image,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(baseFilter)
    .orderBy(sql`${messages.createdAt} DESC, ${messages.id} DESC`)
    .limit(limit);

  // Hydrate invoice rows in a single query rather than N+1.
  const invoiceIds = rowsDesc.map((r) => r.invoiceId).filter((x): x is string => !!x);
  const invoiceMap = new Map<string, {
    id: string;
    description: string;
    amountCents: number;
    status: string;
    dueDate: Date | null;
    paidAt: Date | null;
    paymentUrl: string | null;
    senderId: string | null;
    recipientId: string | null;
  }>();
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
      .where(sql`${invoices.id} IN ${invoiceIds}`);
    for (const inv of invs) invoiceMap.set(inv.id, inv);
  }

  const items = rowsDesc
    .reverse()
    .map((m) => ({
      ...m,
      invoice: m.invoiceId ? invoiceMap.get(m.invoiceId) ?? null : null,
    }));

  const nextCursor =
    rowsDesc.length === limit
      ? rowsDesc[rowsDesc.length - 1].createdAt.toISOString()
      : null;

  return NextResponse.json({ messages: items, nextCursor });
}

// POST a new message. Persists, bumps conversation.updated_at, fans out via
// the SSE bus, returns the inserted row hydrated with sender info.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: conversationId } = await ctx.params;
  if (!(await isConversationMember(session.user.id, conversationId))) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Populate the legacy `projectId` column too when this conversation is a
  // project conversation. Keeps the old /api/messages shim correct without
  // having to teach it to join through conversations.
  const [conv] = await db
    .select({ projectId: conversations.projectId, kind: conversations.kind })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  const [inserted] = await db
    .insert(messages)
    .values({
      conversationId,
      projectId: conv?.kind === "project" ? conv.projectId : null,
      senderId: session.user.id,
      content: parsed.data.content,
      messageType: parsed.data.messageType,
      fileUrl: parsed.data.fileUrl ?? null,
      invoiceId: parsed.data.invoiceId ?? null,
    })
    .returning({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      invoiceId: messages.invoiceId,
      createdAt: messages.createdAt,
    });

  // Touch the conversation so it floats to the top of inbox lists.
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  publishConversationEvent({
    type: "message",
    messageId: inserted.id,
    conversationId,
  });

  // Push notification fan-out — fire-and-forget so the response isn't held
  // by Whop's API.
  const senderUserId = session.user.id;
  const senderName = session.user.name ?? "Someone";
  const messageType = parsed.data.messageType;
  const messageBody = parsed.data.content;
  console.log(
    `[conv-notify] enter conv=${conversationId} sender=${senderUserId}`
  );
  void (async () => {
    try {
      // Pull all participants minus the sender, joined to users for whopUserId.
      const peers = await db
        .select({
          userId: conversationParticipants.userId,
          whopUserId: users.whopUserId,
        })
        .from(conversationParticipants)
        .innerJoin(users, eq(users.id, conversationParticipants.userId))
        .where(eq(conversationParticipants.conversationId, conversationId));
      const recipientWhopIds = peers
        .filter((p) => p.userId !== senderUserId && !!p.whopUserId)
        .map((p) => p.whopUserId as string);
      console.log(
        `[conv-notify] participants=${peers.length} eligible=${recipientWhopIds.length}`
      );
      if (recipientWhopIds.length === 0) return;
      const preview =
        messageType === "file"
          ? `${senderName} shared a file`
          : messageType === "invoice"
          ? `${senderName} sent an invoice`
          : messageBody.slice(0, 140);
      const [convRow] = await db
        .select({ kind: conversations.kind })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      const titlePrefix = convRow?.kind === "project" ? "Project" : "Message";
      // Sender's whopUserId for the icon — best-effort.
      const [me] = await db
        .select({ whopUserId: users.whopUserId })
        .from(users)
        .where(eq(users.id, senderUserId))
        .limit(1);
      await notifyWhopUsers({
        whopUserIds: recipientWhopIds,
        title: `${titlePrefix}: ${senderName}`,
        content: preview,
        iconWhopUserId: me?.whopUserId ?? null,
        deepLinkPath: `/dashboard/inbox?c=${conversationId}`,
      });
    } catch {
      // notifyWhopUsers already swallows internal failures
    }
  })();

  return NextResponse.json({ message: inserted });
}
