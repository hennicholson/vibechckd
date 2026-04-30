import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  transactions,
  users,
  messages,
  conversations,
  conversationParticipants,
  projectMembers,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { whopsdk } from "@/lib/whop-client";
import { publishConversationEvent } from "@/lib/conversation-bus";
import { notifyWhopUsers } from "@/lib/whop-notifications";
import { parseBody, z } from "@/lib/validation";

// POST /api/payments/transfer — direct Whop-balance-to-balance payment.
//
// Moves funds from the sender's Whop ledger straight to the recipient's,
// no card checkout, no app middleman. Per `payments-transfers.md`:
//
//   whopsdk.transfers.create({
//     origin_id: senderWhopUserId,
//     destination_id: recipientWhopUserId,
//     amount: dollars,
//     currency: 'usd',
//     idempotence_key,
//   });
//
// Both parties must have a `users.whopUserId` (Whop SSO sign-in stamps it).
// If the sender lacks balance OR Whop rejects the cross-user transfer,
// the route returns a clear error and the client can fall back to the
// `/api/payments` checkout flow.

const transferSchema = z
  .object({
    recipientId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional(),
    amountCents: z.number().int().positive().max(10_000_000),
    description: z.string().min(1).max(200),
  })
  .strict();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseBody(transferSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { recipientId, projectId, conversationId, amountCents, description } =
    parsed.data;

  if (recipientId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot send a payment to yourself" },
      { status: 400 }
    );
  }

  // Project-scoped permission check (mirrors `/api/payments`): if the
  // payment is bound to a project, both parties must be members.
  if (projectId) {
    const memberships = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    const set = new Set(memberships.map((m) => m.userId));
    if (!set.has(session.user.id) || !set.has(recipientId)) {
      return NextResponse.json(
        { error: "Forbidden: both parties must be project members" },
        { status: 403 }
      );
    }
  }

  // Both users must be on Whop (have a whopUserId) for a balance-to-
  // balance transfer. The `/api/payments` checkout flow remains as the
  // fallback for non-Whop accounts.
  const [sender] = await db
    .select({ whopUserId: users.whopUserId, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const [recipient] = await db
    .select({ whopUserId: users.whopUserId, name: users.name })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);

  if (!sender?.whopUserId) {
    return NextResponse.json(
      {
        error:
          "Sign in via Whop to send from your balance. (Direct vibechckd accounts can use the card checkout flow instead.)",
        code: "sender_no_whop",
      },
      { status: 400 }
    );
  }
  if (!recipient?.whopUserId) {
    return NextResponse.json(
      {
        error:
          "Recipient hasn't linked Whop. They need to sign in via Whop once before you can pay their balance.",
        code: "recipient_no_whop",
      },
      { status: 400 }
    );
  }

  const idempotenceKey = `tx_${crypto.randomUUID()}`;
  const amountDollars = amountCents / 100;

  // Pre-insert the transactions BEFORE the transfer so a webhook race
  // can match on idempotence_key. Insert one positive row for the
  // recipient and one negative row for the sender — earnings page sums
  // by user, so this nets to zero across the system.
  const [recipientTx] = await db
    .insert(transactions)
    .values({
      userId: recipientId,
      projectId: projectId || null,
      type: "direct_payment",
      status: "pending",
      amountCents,
      description,
      senderId: session.user.id,
    })
    .returning({ id: transactions.id });

  const [senderTx] = await db
    .insert(transactions)
    .values({
      userId: session.user.id,
      projectId: projectId || null,
      type: "direct_payment",
      status: "pending",
      amountCents: -amountCents,
      description: `Sent: ${description}`,
      senderId: session.user.id,
    })
    .returning({ id: transactions.id });

  // Execute the Whop transfer. Sender authorizes implicitly via being
  // signed into our app with Whop SSO; the SDK uses our app's
  // `payout:transfer_funds` permission to act on the sender's behalf.
  try {
    const transfer = await whopsdk.transfers.create({
      amount: amountDollars,
      currency: "usd",
      origin_id: sender.whopUserId,
      destination_id: recipient.whopUserId,
      idempotence_key: idempotenceKey,
      notes: description.slice(0, 50),
    });

    // Stamp transfer id + flip both transactions to completed.
    await db
      .update(transactions)
      .set({
        status: "completed",
        whopTransferId: transfer.id,
        completedAt: new Date(),
      })
      .where(eq(transactions.id, recipientTx.id));
    await db
      .update(transactions)
      .set({
        status: "completed",
        whopTransferId: transfer.id,
        completedAt: new Date(),
      })
      .where(eq(transactions.id, senderTx.id));
  } catch (err) {
    // Roll back the pending transactions on failure so /dashboard/earnings
    // doesn't show ghost balances.
    await db
      .update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.id, recipientTx.id));
    await db
      .update(transactions)
      .set({ status: "failed" })
      .where(eq(transactions.id, senderTx.id));

    const msg = err instanceof Error ? err.message : String(err);
    const insufficient = /insufficient|not enough|balance/i.test(msg);
    return NextResponse.json(
      {
        error: insufficient
          ? "Insufficient Whop balance. Top up your Whop wallet, or use the card checkout to pay from a card."
          : `Transfer failed: ${msg}`,
        code: insufficient ? "insufficient_balance" : "transfer_failed",
      },
      { status: 400 }
    );
  }

  // Post a structured payment message in the conversation. Resolve the
  // conversation: explicit conversationId wins, else the project's
  // canonical conversation, else skip.
  let chatConvId: string | null = conversationId ?? null;
  if (!chatConvId && projectId) {
    const [c] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.projectId, projectId),
          eq(conversations.kind, "project")
        )
      )
      .limit(1);
    chatConvId = c?.id ?? null;
  }
  if (chatConvId) {
    const senderName = sender.name || "Someone";
    const recipientName = recipient.name || "a teammate";
    const display = (amountCents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: chatConvId,
        projectId: projectId || null,
        senderId: session.user.id,
        content: `${senderName} sent ${recipientName} $${display} — ${description}`,
        messageType: "system",
      })
      .returning({ id: messages.id });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, chatConvId));

    publishConversationEvent({
      type: "message",
      messageId: msg.id,
      conversationId: chatConvId,
    });

    // Whop push to all participants (excluding sender — they made the
    // payment, no need to ping their own phone). Same scope rules as
    // chat notifications: we resolve via `notifyWhopUsers` which targets
    // by experience_id when configured.
    const peers = await db
      .select({ whopUserId: users.whopUserId })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(eq(conversationParticipants.conversationId, chatConvId));
    const recipients = peers
      .filter((p) => !!p.whopUserId && p.whopUserId !== sender.whopUserId)
      .map((p) => p.whopUserId as string);
    if (recipients.length > 0) {
      void notifyWhopUsers({
        whopUserIds: recipients,
        title: `Payment from ${senderName}`,
        content: `$${display} — ${description}`,
        iconWhopUserId: sender.whopUserId,
        deepLinkPath: `/dashboard/inbox?c=${chatConvId}`,
      });
    }
  }

  return NextResponse.json({
    success: true,
    senderTxId: senderTx.id,
    recipientTxId: recipientTx.id,
  });
}
