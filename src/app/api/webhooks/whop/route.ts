import { NextRequest } from "next/server";
import { after } from "next/server";
import { db } from "@/db";
import {
  invoices,
  invoiceSplits,
  messages,
  transactions,
  withdrawals,
  conversations,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { whopsdk } from "@/lib/whop-client";
import { publishConversationEvent } from "@/lib/conversation-bus";

// POST /api/webhooks/whop
//
// Per `payments-webhooks.md` skill:
//   1. Verify the signature with `whopsdk.webhooks.unwrap(...)` — replaces
//      our hand-rolled HMAC + multi-secret-format guessing. The SDK does
//      timestamp-replay rejection internally and decodes whichever secret
//      format the SDK is configured with (we now base64-encode it in
//      whop-client.ts).
//   2. Return 200 immediately, do all DB / SDK work in `after()` — Whop
//      retries on 5xx OR if the response takes >5s; long DB writes block
//      the response and trigger duplicate retries.
//
// Each handler is idempotent (status checks before writes) so retries are
// safe even if `after()` is duplicated.
export async function POST(request: NextRequest) {
  let event: ReturnType<typeof whopsdk.webhooks.unwrap> | null = null;
  try {
    const body = await request.text();
    const headersObj = Object.fromEntries(request.headers);
    event = whopsdk.webhooks.unwrap(body, { headers: headersObj });
  } catch (err) {
    console.warn("Whop webhook: signature verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  // Schedule processing AFTER the response has been sent. Returns 200 in
  // a few ms regardless of how long the handler takes.
  after(async () => {
    try {
      await dispatchEvent(event!);
    } catch (err) {
      console.error("Whop webhook handler failed:", err);
      // Swallowed — the 200 already went out, retrying isn't useful.
    }
  });

  return new Response("OK", { status: 200 });
}

type AnyWebhookEvent = ReturnType<typeof whopsdk.webhooks.unwrap>;

async function dispatchEvent(event: AnyWebhookEvent): Promise<void> {
  // SDK gives us an `action` string (e.g. "invoice.paid"). Older payloads
  // may also expose `event` or `type` — fall through both for safety.
  const action =
    (event as { action?: string }).action ??
    (event as { event?: string }).event ??
    (event as { type?: string }).type;
  if (!action) return;

  switch (action) {
    case "invoice.paid":
    case "invoice.voided":
    case "invoice.past_due":
    case "invoice.uncollectible":
    case "invoice.created":
      await handleInvoiceEvent(action, event as unknown as Record<string, unknown>);
      break;
    case "payment.succeeded":
      await handlePaymentSucceeded(event as unknown as Record<string, unknown>);
      break;
    case "payment.failed":
      // Mark any pending transaction tied to this checkout as failed so
      // /dashboard/earnings doesn't show ghost pending balance forever.
      await handlePaymentFailed(event as unknown as Record<string, unknown>);
      break;
    case "withdrawal.completed":
    case "withdrawal.updated":
      await handleWithdrawalCompleted(event as unknown as Record<string, unknown>);
      break;
    case "withdrawal.failed":
      await handleWithdrawalFailed(event as unknown as Record<string, unknown>);
      break;
    case "membership.activated":
    case "membership.deactivated":
      // Non-fatal placeholder — vibechckd doesn't gate features on Whop
      // memberships today, but log so we can wire it up later.
      console.log(`[whop] membership event: ${action}`);
      break;
    case "refund.created":
    case "refund.updated":
      // Same: log + skip; no refund-handling product flow yet.
      console.log(`[whop] refund event: ${action}`);
      break;
    case "dispute.created":
    case "dispute.updated":
      console.log(`[whop] dispute event: ${action}`);
      break;
    default:
      // Unhandled event types are intentionally a no-op so adding new
      // Whop events upstream doesn't break our endpoint.
      break;
  }
}

async function handlePaymentFailed(payload: Record<string, unknown>): Promise<void> {
  const data = (payload as { data?: Record<string, unknown> }).data || {};
  const checkoutId =
    (data.checkout_session_id as string | undefined) ||
    (data.checkout_id as string | undefined);
  if (!checkoutId) return;
  await db
    .update(transactions)
    .set({ status: "failed" })
    .where(
      and(
        eq(transactions.whopCheckoutId, checkoutId),
        eq(transactions.status, "pending")
      )
    );
}

async function handleInvoiceEvent(
  eventType: string,
  payload: Record<string, any>
) {
  const whopInvoiceId = payload.data?.id || payload.invoice_id;
  if (!whopInvoiceId) return;

  // Look up the invoice in our table
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.whopInvoiceId, whopInvoiceId))
    .limit(1);

  if (!invoice) {
    console.warn(
      `Whop webhook: no matching invoice found for ${whopInvoiceId}`
    );
    return;
  }

  let newStatus: "paid" | "voided" | "past_due" | null = null;

  switch (eventType) {
    case "invoice.paid":
      newStatus = "paid";
      break;
    case "invoice.voided":
      newStatus = "voided";
      break;
    case "invoice.past_due":
      newStatus = "past_due";
      break;
  }

  if (!newStatus) return;

  await db
    .update(invoices)
    .set({
      status: newStatus,
      ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
    })
    .where(eq(invoices.whopInvoiceId, whopInvoiceId));

  // Resolve the conversation containing the invoice's chat message so the
  // SSE event lands on the right channel. Falls back to project conversation.
  let conversationId: string | null = null;
  if (invoice.messageId) {
    const [m] = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, invoice.messageId))
      .limit(1);
    conversationId = m?.conversationId ?? null;
  }
  if (!conversationId && invoice.projectId) {
    const [c] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.projectId, invoice.projectId),
          eq(conversations.kind, "project")
        )
      )
      .limit(1);
    conversationId = c?.id ?? null;
  }
  if (conversationId) {
    publishConversationEvent({
      type: "invoice_status",
      invoiceId: invoice.id,
      status: newStatus,
      conversationId,
    });
  }

  // On payment: credit the right earner(s) via transaction rows.
  // - If splits exist, every split.userId gets a per-split transaction +
  //   the split's `paid` flag flips. This is what makes /dashboard/earnings
  //   accurate for collaborators.
  // - If no splits, a single transaction is credited to invoice.senderId
  //   (the party who issued the invoice and is owed the money).
  if (eventType === "invoice.paid") {
    const splits = await db
      .select({
        id: invoiceSplits.id,
        userId: invoiceSplits.userId,
        amountCents: invoiceSplits.amountCents,
        paid: invoiceSplits.paid,
      })
      .from(invoiceSplits)
      .where(eq(invoiceSplits.invoiceId, invoice.id));

    if (splits.length > 0) {
      // Mark every split paid (idempotent).
      await db
        .update(invoiceSplits)
        .set({ paid: true })
        .where(eq(invoiceSplits.invoiceId, invoice.id));

      for (const s of splits) {
        if (s.paid) continue; // already credited on a previous webhook delivery
        const [existing] = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.invoiceId, invoice.id),
              eq(transactions.userId, s.userId),
              eq(transactions.type, "invoice_payment")
            )
          )
          .limit(1);
        if (existing) continue;
        const [tx] = await db
          .insert(transactions)
          .values({
            userId: s.userId,
            projectId: invoice.projectId,
            invoiceId: invoice.id,
            type: "invoice_payment",
            status: "completed",
            amountCents: s.amountCents,
            description: `Invoice payment: ${invoice.description}`,
            completedAt: new Date(),
          })
          .returning({ id: transactions.id });

        // Whop-native pass-through: move the creator's share from our app's
        // Whop balance to their personal Whop ledger. They withdraw from
        // there via Whop's wallet UI (KYC, payout method, etc. all handled
        // by Whop). Skipped silently when the user has no whopUserId
        // (direct vibechckd.cc accounts) — they fall back to the legacy
        // /api/withdrawals path. Idempotent via key derived from split id.
        await transferToCreatorLedger({
          userId: s.userId,
          amountCents: s.amountCents,
          idempotenceKey: `split_${s.id}`,
          notes: `Vibechckd invoice ${invoice.id.slice(0, 8)}`,
          transactionId: tx.id,
        });
      }
    } else if (invoice.senderId) {
      const [existing] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.invoiceId, invoice.id),
            eq(transactions.type, "invoice_payment")
          )
        )
        .limit(1);
      if (!existing) {
        const [tx] = await db
          .insert(transactions)
          .values({
            userId: invoice.senderId,
            projectId: invoice.projectId,
            invoiceId: invoice.id,
            type: "invoice_payment",
            status: "completed",
            amountCents: invoice.amountCents,
            description: `Invoice payment: ${invoice.description}`,
            completedAt: new Date(),
          })
          .returning({ id: transactions.id });

        await transferToCreatorLedger({
          userId: invoice.senderId,
          amountCents: invoice.amountCents,
          idempotenceKey: `invoice_${invoice.id}`,
          notes: `Vibechckd invoice ${invoice.id.slice(0, 8)}`,
          transactionId: tx.id,
        });
      }
    }
  }
}

// Whop-native marketplace pass-through. Per `payments-transfers.md` skill:
//   - Source: our app's Whop company (`WHOP_COMPANY_ID`) — where invoice
//     payments land when our app issued the invoice.
//   - Destination: the creator's personal Whop user ledger (`user_xxx`).
//   - Amount in dollars (Whop SDK convention; our DB stores cents).
//   - Idempotence key prevents duplicate transfers on webhook retries.
//
// Failure modes are non-fatal — the transaction row is already credited in
// our DB so the creator sees the earnings, and the legacy /api/withdrawals
// path still works as a fallback. We just stamp `whopTransferId` on success
// and `failureReason` on failure for observability.
async function transferToCreatorLedger(opts: {
  userId: string;
  amountCents: number;
  idempotenceKey: string;
  notes: string;
  transactionId: string;
}): Promise<void> {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) return;

  const [user] = await db
    .select({ whopUserId: users.whopUserId })
    .from(users)
    .where(eq(users.id, opts.userId))
    .limit(1);
  if (!user?.whopUserId) {
    // Direct vibechckd.cc account — no Whop ledger to transfer to.
    return;
  }

  try {
    const transfer = await whopsdk.transfers.create({
      amount: opts.amountCents / 100,
      currency: "usd",
      origin_id: companyId,
      destination_id: user.whopUserId,
      idempotence_key: opts.idempotenceKey,
      notes: opts.notes.slice(0, 50), // Whop caps notes at 50 chars
    });
    await db
      .update(transactions)
      .set({ whopTransferId: transfer.id })
      .where(eq(transactions.id, opts.transactionId));
  } catch (err) {
    console.warn(
      `[whop] transfer to ${user.whopUserId} failed (${opts.idempotenceKey}):`,
      err
    );
    // Don't propagate — the DB credit stands; manual reconciliation
    // remains available via /api/withdrawals.
  }
}

async function handlePaymentSucceeded(payload: Record<string, any>) {
  const data = payload.data || {};

  // Try every possible field path for the checkout config ID
  const checkoutId =
    data.checkout_configuration_id ||
    data.checkout_session_id ||
    data.checkout_id ||
    data.checkout_configuration?.id ||
    data.plan?.checkout_configuration_id;

  // Also try to find the transaction via metadata.transactionId
  const metadataTransactionId =
    data.metadata?.transactionId ||
    data.checkout_configuration?.metadata?.transactionId;

  console.log("payment.succeeded webhook:", JSON.stringify({
    checkoutId,
    metadataTransactionId,
    dataId: data.id,
    dataKeys: Object.keys(data),
  }));

  let transaction = null;

  // First try: match by metadata transactionId (most reliable)
  if (metadataTransactionId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, metadataTransactionId))
      .limit(1);
    if (found) transaction = found;
  }

  // Second try: match by checkout ID
  if (!transaction && checkoutId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.whopCheckoutId, checkoutId))
      .limit(1);
    if (found) transaction = found;
  }

  // Third try: match by any ID field in the payload
  if (!transaction && data.id) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.whopCheckoutId, data.id))
      .limit(1);
    if (found) transaction = found;
  }

  if (!transaction || transaction.status !== "pending") {
    console.log("payment.succeeded: no matching pending transaction found");
    return;
  }

  // Update transaction to completed
  await db
    .update(transactions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(transactions.id, transaction.id));

  // Post system message if linked to a project
  if (transaction.projectId) {
    const displayAmount = (transaction.amountCents / 100).toLocaleString(
      "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );

    await db.insert(messages).values({
      projectId: transaction.projectId,
      senderId: null,
      content: `PAYMENT RECEIVED\nAmount: $${displayAmount}\nDescription: ${transaction.description}\nStatus: Completed`,
      messageType: "system",
      fileUrl: null,
    });
  }

  console.log(`payment.succeeded: transaction ${transaction.id} marked completed`);
}

async function handleWithdrawalCompleted(payload: Record<string, any>) {
  const whopWithdrawalId = payload.data?.id || payload.withdrawal_id;
  if (!whopWithdrawalId) return;

  // Update withdrawal record
  const [withdrawal] = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.whopWithdrawalId, whopWithdrawalId))
    .limit(1);

  if (!withdrawal) return;

  await db
    .update(withdrawals)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawal.id));

  // Update the corresponding transaction
  await db
    .update(transactions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.userId, withdrawal.userId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending"),
        eq(transactions.amountCents, -withdrawal.amountCents)
      )
    );
}

async function handleWithdrawalFailed(payload: Record<string, any>) {
  const whopWithdrawalId = payload.data?.id || payload.withdrawal_id;
  const failureReason =
    payload.data?.failure_reason || payload.data?.error || "Unknown error";

  if (!whopWithdrawalId) return;

  // Update withdrawal record
  const [withdrawal] = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.whopWithdrawalId, whopWithdrawalId))
    .limit(1);

  if (!withdrawal) return;

  await db
    .update(withdrawals)
    .set({
      status: "failed",
      failureReason,
    })
    .where(eq(withdrawals.id, withdrawal.id));

  // Update the corresponding transaction
  await db
    .update(transactions)
    .set({
      status: "failed",
    })
    .where(
      and(
        eq(transactions.userId, withdrawal.userId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending"),
        eq(transactions.amountCents, -withdrawal.amountCents)
      )
    );
}
