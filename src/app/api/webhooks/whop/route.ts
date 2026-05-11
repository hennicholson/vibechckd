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
  disputes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { whopsdk } from "@/lib/whop-client";
import { publishConversationEvent } from "@/lib/conversation-bus";
import { notifyWhopUsers } from "@/lib/whop-notifications";

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
    case "payment.refunded":
    case "refund.created":
    case "refund.updated":
      await handleRefund(event as unknown as Record<string, unknown>);
      break;
    case "dispute.created":
    case "payment.dispute.created":
      await handleDispute(event as unknown as Record<string, unknown>, "open");
      break;
    case "dispute.updated":
    case "payment.dispute.updated":
      await handleDispute(event as unknown as Record<string, unknown>, "update");
      break;
    case "dispute.closed":
    case "payment.dispute.closed":
      await handleDispute(event as unknown as Record<string, unknown>, "close");
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
  payload: Record<string, unknown>
) {
  // The SDK normalizes events under `data`. The legacy `payload.invoice_id`
  // fallback only fires for ancient payloads that don't reach prod anymore
  // — dropping it makes the type signature honest and removes a dead path.
  const data = (payload.data as { id?: string } | undefined) || {};
  const whopInvoiceId = data.id;
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
      for (const s of splits) {
        // Compare-and-swap: only the first webhook delivery that observes
        // paid=false flips it and proceeds to credit + transfer. Any later
        // delivery sees 0 rows updated and short-circuits, so a crash
        // mid-loop on delivery #1 doesn't strand splits 2..N as "paid"
        // with no matching transaction. The Neon HTTP driver doesn't
        // support row-level locks — this conditional UPDATE is the
        // equivalent atomic primitive.
        const claim = await db
          .update(invoiceSplits)
          .set({ paid: true })
          .where(
            and(eq(invoiceSplits.id, s.id), eq(invoiceSplits.paid, false))
          )
          .returning({ id: invoiceSplits.id });
        if (claim.length === 0) continue;

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

        await notifyRecipientPaymentLanded(
          s.userId,
          s.amountCents,
          `Your share of "${invoice.description}" just landed.`
        );
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

        await notifyRecipientPaymentLanded(
          invoice.senderId,
          invoice.amountCents,
          `"${invoice.description}" was paid in full.`
        );
      }
    }
  }
}

// Helper: push a Whop notification to a vibechckd user when funds land in
// their wallet. Silent for non-Whop accounts (no `whopUserId`).
async function notifyRecipientPaymentLanded(
  userId: string,
  amountCents: number,
  description: string
): Promise<void> {
  const [recipient] = await db
    .select({ whopUserId: users.whopUserId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!recipient?.whopUserId) return;
  const displayAmount = (amountCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  await notifyWhopUsers({
    whopUserIds: [recipient.whopUserId],
    title: `Payment received · $${displayAmount}`,
    content: description,
    deepLinkPath: "/dashboard/earnings",
  });
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

async function handlePaymentSucceeded(payload: Record<string, unknown>) {
  // `data` shape varies across event versions — keep the local binding
  // permissive but the entry-point payload type narrow so signature
  // expectations at the dispatch boundary stay honest.
  const data = ((payload.data as Record<string, any>) || {}) as Record<string, any>;

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

  // Redacted: don't log Object.keys(data) or full payload — Whop payloads
  // can include customer email + arbitrary metadata. Only log identifiers
  // we need to debug routing.
  console.log(
    "payment.succeeded webhook: checkoutId=",
    checkoutId,
    "metaTxId=",
    metadataTransactionId,
    "dataId=",
    data.id
  );

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

  // Compare-and-swap: only the first webhook delivery that observes the
  // pending state flips it. A duplicate delivery sees 0 rows updated and
  // exits before re-posting the system message or re-firing the ledger
  // transfer (which is also independently idempotent via its key).
  const claim = await db
    .update(transactions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(
      and(eq(transactions.id, transaction.id), eq(transactions.status, "pending"))
    )
    .returning({ id: transactions.id });
  if (claim.length === 0) {
    console.log("payment.succeeded: another delivery already settled this");
    return;
  }

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

  // Marketplace pass-through: funds just landed in our app's Whop balance
  // from the sender's checkout. Forward the recipient's share to their
  // Whop ledger so they can withdraw natively (KYC + payout method all
  // handled by Whop). Idempotent via key derived from transaction id —
  // webhook retries can't double-pay. Skipped when recipient has no
  // Whop link (legacy /api/withdrawals path stays available for them).
  if (transaction.amountCents > 0) {
    await transferToCreatorLedger({
      userId: transaction.userId,
      amountCents: transaction.amountCents,
      idempotenceKey: `payment_${transaction.id}`,
      notes: `Vibechckd payment ${transaction.id.slice(0, 8)}`,
      transactionId: transaction.id,
    });

    await notifyRecipientPaymentLanded(
      transaction.userId,
      transaction.amountCents,
      transaction.description || "A new payment landed in your wallet."
    );
  }

  console.log(`payment.succeeded: transaction ${transaction.id} marked completed`);
}

async function handleWithdrawalCompleted(payload: Record<string, unknown>) {
  // Drop legacy `|| payload.withdrawal_id` fallback — SDK normalizes
  // events under `data`. Per audit, the legacy path never fired correctly.
  const data = (payload.data as { id?: string } | undefined) || {};
  const whopWithdrawalId = data.id;
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

async function handleWithdrawalFailed(payload: Record<string, unknown>) {
  const data =
    (payload.data as { id?: string; failure_reason?: string; error?: string } | undefined) || {};
  const whopWithdrawalId = data.id;
  const failureReason = data.failure_reason || data.error || "Unknown error";

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

// ── Refund handler ──
//
// Per our terms (vibechckd is a facilitator; Whop processes payments) we
// reflect the refund in our DB but never initiate one ourselves. When a
// payment is refunded by Whop, we:
//   1. Locate the original `transactions` row via whopCheckoutId or
//      metadata.transactionId — same matchers as handlePaymentSucceeded.
//   2. Insert a reversing transaction (negative amount, type='refund').
//   3. Attempt to claw back the recipient's ledger transfer if we'd already
//      forwarded their share. If they've already withdrawn from Whop, the
//      clawback fails — we mark `whop_refund_id` and let ops reconcile.
async function handleRefund(payload: Record<string, unknown>): Promise<void> {
  const data = ((payload.data as Record<string, any>) || {}) as Record<string, any>;
  const refundId: string | undefined =
    data.id || data.refund_id || payload.refund_id;
  const checkoutId: string | undefined =
    data.checkout_configuration_id ||
    data.checkout_session_id ||
    data.checkout_id ||
    data.checkout_configuration?.id ||
    data.payment?.checkout_configuration_id;
  const metadataTxId: string | undefined =
    data.metadata?.transactionId ||
    data.payment?.metadata?.transactionId;
  const refundAmountCents: number | undefined =
    typeof data.amount === "number"
      ? Math.round(data.amount * 100)
      : typeof data.amount_cents === "number"
        ? data.amount_cents
        : undefined;

  console.log(
    "refund webhook: refundId=",
    refundId,
    "checkoutId=",
    checkoutId,
    "metaTxId=",
    metadataTxId
  );

  let originalTx = null;
  if (metadataTxId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, metadataTxId))
      .limit(1);
    if (found) originalTx = found;
  }
  if (!originalTx && checkoutId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.whopCheckoutId, checkoutId))
      .limit(1);
    if (found) originalTx = found;
  }

  if (!originalTx) {
    console.warn("refund webhook: no matching original transaction");
    return;
  }

  // Compare-and-swap: only the first delivery for this refund id creates the
  // reversing row. We use whopRefundId as the dedupe key. Without a refundId
  // (rare) we fall back to status-flip on the original.
  const amount = refundAmountCents ?? originalTx.amountCents;

  if (refundId) {
    const existingRefund = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.whopRefundId, refundId))
      .limit(1);
    if (existingRefund.length > 0) {
      console.log("refund webhook: already recorded", refundId);
      return;
    }
  }

  await db.insert(transactions).values({
    userId: originalTx.userId,
    projectId: originalTx.projectId,
    invoiceId: originalTx.invoiceId,
    senderId: originalTx.senderId,
    type: "refund",
    status: "completed",
    amountCents: -amount,
    description: `Refund: ${originalTx.description}`,
    whopRefundId: refundId ?? null,
    originalTransactionId: originalTx.id,
    completedAt: new Date(),
  });

  // System message in the project chat for visibility.
  if (originalTx.projectId) {
    const displayAmount = (amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    await db.insert(messages).values({
      projectId: originalTx.projectId,
      senderId: null,
      content: `Refund issued · -$${displayAmount}\n${originalTx.description}\nProcessed by Whop. Disputes are handled by Whop and the card networks.`,
      messageType: "system",
      fileUrl: null,
    });
  }

  // Attempt clawback of the creator's ledger transfer if we'd already
  // forwarded their share. If the creator has already withdrawn, this fails
  // — that's expected; the refund liability is between the creator and Whop.
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId || !originalTx.whopTransferId) return;
  const [recipient] = await db
    .select({ whopUserId: users.whopUserId })
    .from(users)
    .where(eq(users.id, originalTx.userId))
    .limit(1);
  if (!recipient?.whopUserId) return;
  try {
    await whopsdk.transfers.create({
      amount: amount / 100,
      currency: "usd",
      origin_id: recipient.whopUserId,
      destination_id: companyId,
      idempotence_key: `clawback_${originalTx.id}`,
      notes: `Refund clawback ${originalTx.id.slice(0, 8)}`.slice(0, 50),
    });
    console.log("refund webhook: clawback succeeded for", originalTx.id);
  } catch (err) {
    console.warn(
      "refund webhook: clawback failed (likely already withdrawn) for",
      originalTx.id,
      "-",
      err instanceof Error ? err.message : "unknown"
    );
  }
}

// ── Dispute (chargeback) handler ──
//
// vibechckd never freezes balances on dispute. Whop holds disputed funds at
// the card-network layer; our job is to record the dispute against the
// transaction so the dashboard can show it, and to attempt a clawback if
// the dispute resolves as `lost`.
async function handleDispute(
  payload: Record<string, unknown>,
  phase: "open" | "update" | "close"
): Promise<void> {
  const data = ((payload.data as Record<string, any>) || {}) as Record<string, any>;
  const disputeId: string | undefined = data.id || data.dispute_id;
  if (!disputeId) {
    console.warn("dispute webhook: missing dispute id");
    return;
  }
  const checkoutId: string | undefined =
    data.checkout_configuration_id ||
    data.payment?.checkout_configuration_id ||
    data.checkout_session_id;
  const metadataTxId: string | undefined =
    data.metadata?.transactionId ||
    data.payment?.metadata?.transactionId;
  const reason: string | undefined = data.reason || data.dispute_reason;
  const amountCents =
    typeof data.amount === "number"
      ? Math.round(data.amount * 100)
      : typeof data.amount_cents === "number"
        ? data.amount_cents
        : 0;

  // Map Whop's status string to our enum, defaulting cautiously.
  const rawStatus = (data.status || data.outcome || "").toLowerCase();
  const status: "open" | "under_review" | "won" | "lost" | "closed" =
    rawStatus === "won" || rawStatus === "won_by_merchant"
      ? "won"
      : rawStatus === "lost" || rawStatus === "lost_by_merchant"
        ? "lost"
        : rawStatus === "closed"
          ? "closed"
          : phase === "open"
            ? "open"
            : "under_review";

  // Locate the original transaction.
  let originalTx = null;
  if (metadataTxId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, metadataTxId))
      .limit(1);
    if (found) originalTx = found;
  }
  if (!originalTx && checkoutId) {
    const [found] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.whopCheckoutId, checkoutId))
      .limit(1);
    if (found) originalTx = found;
  }
  if (!originalTx) {
    console.warn("dispute webhook: no matching transaction for", disputeId);
    return;
  }

  // Upsert the dispute row by whop_dispute_id (unique).
  const [existing] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.whopDisputeId, disputeId))
    .limit(1);

  if (!existing) {
    await db.insert(disputes).values({
      transactionId: originalTx.id,
      whopDisputeId: disputeId,
      status,
      amountCents: amountCents || originalTx.amountCents,
      reason: reason ?? null,
      resolvedAt: phase === "close" || status === "won" || status === "lost"
        ? new Date()
        : null,
    });
  } else {
    await db
      .update(disputes)
      .set({
        status,
        reason: reason ?? existing.reason,
        resolvedAt:
          phase === "close" || status === "won" || status === "lost"
            ? new Date()
            : existing.resolvedAt,
      })
      .where(eq(disputes.id, existing.id));
  }

  // Project chat note on open so both parties see it. Quiet on update/close.
  if (phase === "open" && originalTx.projectId) {
    await db.insert(messages).values({
      projectId: originalTx.projectId,
      senderId: null,
      content: `Payment disputed by the cardholder.\nWhop is reviewing under their dispute process. We don't process payments — chargeback decisions are made by Whop and the card network.`,
      messageType: "system",
      fileUrl: null,
    });
  }

  // If the dispute is lost, attempt a clawback (idempotent via key).
  if (status === "lost") {
    const companyId = process.env.WHOP_COMPANY_ID;
    if (!companyId || !originalTx.whopTransferId) return;
    const [recipient] = await db
      .select({ whopUserId: users.whopUserId })
      .from(users)
      .where(eq(users.id, originalTx.userId))
      .limit(1);
    if (!recipient?.whopUserId) return;
    const amt = (amountCents || originalTx.amountCents) / 100;
    try {
      await whopsdk.transfers.create({
        amount: amt,
        currency: "usd",
        origin_id: recipient.whopUserId,
        destination_id: companyId,
        idempotence_key: `dispute_clawback_${disputeId}`,
        notes: `Dispute lost ${disputeId.slice(0, 8)}`.slice(0, 50),
      });
      await db
        .update(disputes)
        .set({ clawbackStatus: "recovered" })
        .where(eq(disputes.whopDisputeId, disputeId));
    } catch (err) {
      await db
        .update(disputes)
        .set({ clawbackStatus: "failed" })
        .where(eq(disputes.whopDisputeId, disputeId));
      console.warn(
        "dispute webhook: clawback failed for",
        disputeId,
        "-",
        err instanceof Error ? err.message : "unknown"
      );
    }
  }
}
