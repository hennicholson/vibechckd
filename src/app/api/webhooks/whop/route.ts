import { NextRequest } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { like, asc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.event || payload.type;
    const invoiceId = payload.data?.id || payload.invoice_id;

    if (!eventType || !invoiceId) {
      return new Response("OK", { status: 200 });
    }

    // Find the project that has a message containing this invoice ID
    const allMessages = await db
      .select()
      .from(messages)
      .where(like(messages.content, `%${invoiceId}%`))
      .orderBy(asc(messages.createdAt));

    const matchingMessage = allMessages[0];

    if (!matchingMessage) {
      console.warn(
        `Whop webhook: no matching message found for invoice ${invoiceId}`
      );
      return new Response("OK", { status: 200 });
    }

    const projectId = matchingMessage.projectId;

    let systemContent: string | null = null;

    switch (eventType) {
      case "invoice.paid": {
        systemContent = `\u2705 INVOICE PAID\nInvoice ${invoiceId} has been paid`;
        break;
      }
      case "invoice.voided": {
        systemContent = `\u274C INVOICE VOIDED\nInvoice ${invoiceId} has been voided`;
        break;
      }
      case "invoice.past_due": {
        systemContent = `\u26A0\uFE0F INVOICE PAST DUE\nInvoice ${invoiceId} is past due`;
        break;
      }
      default: {
        // Unknown event type — acknowledge but do nothing
        return new Response("OK", { status: 200 });
      }
    }

    if (systemContent) {
      await db.insert(messages).values({
        projectId,
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
