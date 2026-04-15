import { NextRequest } from "next/server";
import { db } from "@/db";
import { invoices, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
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
