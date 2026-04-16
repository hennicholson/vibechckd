import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, messages, transactions, withdrawals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";

// Standard Webhooks signature verification
function verifySignature(body: string, headers: Headers): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured

  const sigHeader = headers.get("webhook-signature");
  const msgId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");

  // If Whop doesn't send standard webhook headers, skip verification
  // (some Whop webhook implementations don't use standard-webhooks)
  if (!sigHeader || !msgId || !timestamp) {
    console.log("Webhook: no standard-webhook headers, skipping signature check");
    return true;
  }

  // Reject timestamps older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // Try multiple secret formats
  const rawSecret = secret.replace(/^(whsec_|ws_)/, "");
  const secretVariants = [
    Buffer.from(rawSecret, "base64"),   // base64 decoded
    Buffer.from(rawSecret, "hex"),      // hex decoded
    Buffer.from(rawSecret, "utf-8"),    // raw string
  ];

  const toSign = `${msgId}.${timestamp}.${body}`;

  const signatures = sigHeader.split(" ");
  for (const secretBytes of secretVariants) {
    const computed = createHmac("sha256", secretBytes).update(toSign).digest("base64");
    for (const sig of signatures) {
      const parts = sig.split(",");
      if (parts[0] !== "v1" || !parts[1]) continue;
      try {
        const expected = Buffer.from(parts[1], "base64");
        const actual = Buffer.from(computed, "base64");
        if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  console.warn("Webhook: signature verification failed");
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    if (!verifySignature(body, request.headers)) {
      console.warn("Whop webhook: invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event || payload.type;

    if (!eventType) {
      return new Response("OK", { status: 200 });
    }

    switch (eventType) {
      case "invoice.paid":
      case "invoice.voided":
      case "invoice.past_due": {
        await handleInvoiceEvent(eventType, payload);
        break;
      }
      case "payment.succeeded": {
        await handlePaymentSucceeded(payload);
        break;
      }
      case "withdrawal.completed": {
        await handleWithdrawalCompleted(payload);
        break;
      }
      case "withdrawal.failed": {
        await handleWithdrawalFailed(payload);
        break;
      }
      default: {
        // Unhandled event type
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Whop webhook error:", error);
    // Always return 200 to prevent Whop from retrying
    return new Response("OK", { status: 200 });
  }
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
  let systemContent: string | null = null;

  switch (eventType) {
    case "invoice.paid": {
      newStatus = "paid";
      systemContent = `INVOICE PAID\nInvoice ${whopInvoiceId} has been paid`;
      break;
    }
    case "invoice.voided": {
      newStatus = "voided";
      systemContent = `INVOICE VOIDED\nInvoice ${whopInvoiceId} has been voided`;
      break;
    }
    case "invoice.past_due": {
      newStatus = "past_due";
      systemContent = `INVOICE PAST DUE\nInvoice ${whopInvoiceId} is past due`;
      break;
    }
  }

  // Update the invoice status
  if (newStatus) {
    await db
      .update(invoices)
      .set({
        status: newStatus,
        ...(newStatus === "paid" ? { paidAt: new Date() } : {}),
      })
      .where(eq(invoices.whopInvoiceId, whopInvoiceId));
  }

  // Post a system message to the project chat
  if (systemContent && invoice.projectId) {
    await db.insert(messages).values({
      projectId: invoice.projectId,
      senderId: null,
      content: systemContent,
      messageType: "system",
      fileUrl: null,
    });
  }

  // On invoice.paid, also create a transaction record (idempotent)
  if (eventType === "invoice.paid" && invoice.senderId) {
    // Check if a transaction already exists for this invoice
    const [existing] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.invoiceId, invoice.id),
          eq(transactions.type, "invoice_payment")
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(transactions).values({
        userId: invoice.senderId,
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        type: "invoice_payment",
        status: "completed",
        amountCents: invoice.amountCents,
        description: `Invoice payment: ${invoice.description}`,
        completedAt: new Date(),
      });
    }
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
