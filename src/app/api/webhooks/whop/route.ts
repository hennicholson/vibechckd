import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";

// Standard Webhooks signature verification
function verifySignature(body: string, headers: Headers): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured

  const sigHeader = headers.get("webhook-signature");
  const msgId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");

  if (!sigHeader || !msgId || !timestamp) return false;

  // Reject timestamps older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  // Strip prefix (whsec_ or ws_) and decode base64 secret
  const rawSecret = secret.replace(/^(whsec_|ws_)/, "");
  const secretBytes = Buffer.from(rawSecret, "base64");

  // Sign: msg_id.timestamp.body
  const toSign = `${msgId}.${timestamp}.${body}`;
  const computed = createHmac("sha256", secretBytes).update(toSign).digest("base64");

  // Check against all signatures in the header (v1,<base64>)
  const signatures = sigHeader.split(" ");
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
    const whopInvoiceId = payload.data?.id || payload.invoice_id;

    if (!eventType || !whopInvoiceId) {
      return new Response("OK", { status: 200 });
    }

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
      return new Response("OK", { status: 200 });
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
      default: {
        return new Response("OK", { status: 200 });
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

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Whop webhook error:", error);
    // Always return 200 to prevent Whop from retrying
    return new Response("OK", { status: 200 });
  }
}
