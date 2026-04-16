import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, invoiceSplits, users, messages } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const senderUser = alias(users, "senderUser");
    const recipientUser = alias(users, "recipientUser");

    const rows = await db
      .select({
        invoice: invoices,
        senderName: senderUser.name,
        senderEmail: senderUser.email,
        recipientName: recipientUser.name,
        recipientEmail: recipientUser.email,
      })
      .from(invoices)
      .leftJoin(senderUser, eq(invoices.senderId, senderUser.id))
      .leftJoin(recipientUser, eq(invoices.recipientId, recipientUser.id))
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)
          ? eq(invoices.id, id)
          : eq(invoices.whopInvoiceId, id)
      )
      .limit(1);

    if (rows.length === 0) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const row = rows[0];

    // Fetch splits with user names
    const splits = await db
      .select({
        id: invoiceSplits.id,
        userId: invoiceSplits.userId,
        amountCents: invoiceSplits.amountCents,
        paid: invoiceSplits.paid,
        createdAt: invoiceSplits.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(invoiceSplits)
      .leftJoin(users, eq(invoiceSplits.userId, users.id))
      .where(eq(invoiceSplits.invoiceId, id));

    return Response.json({
      ...row.invoice,
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      splits,
    });
  } catch (error) {
    console.error("Invoice fetch error:", error);
    return Response.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return Response.json({ error: "status is required" }, { status: 400 });
    }

    // Fetch the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? eq(invoices.id, id) : eq(invoices.whopInvoiceId, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Must be sender or recipient
    const isSender = invoice.senderId === session.user.id;
    const isRecipient = invoice.recipientId === session.user.id;
    if (!isSender && !isRecipient) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      draft: ["sent"],
      sent: ["voided"],
    };

    const allowed = allowedTransitions[invoice.status];
    if (!allowed || !allowed.includes(status)) {
      return Response.json(
        { error: `Cannot transition from ${invoice.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update the invoice status
    const [updated] = await db
      .update(invoices)
      .set({ status })
      .where(/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? eq(invoices.id, id) : eq(invoices.whopInvoiceId, id))
      .returning();

    // Post system message to project chat
    if (invoice.projectId) {
      const displayAmount = (invoice.amountCents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      let messageContent = "";
      if (status === "sent") {
        messageContent = `\u{1F4E8} Invoice for $${displayAmount} has been sent.\nDescription: ${invoice.description}`;
        if (invoice.paymentUrl) {
          messageContent += `\nPay: ${invoice.paymentUrl}`;
        }
      } else if (status === "voided") {
        messageContent = `\u274C Invoice for $${displayAmount} has been voided.\nDescription: ${invoice.description}`;
      }

      if (messageContent) {
        await db.insert(messages).values({
          projectId: invoice.projectId,
          senderId: session.user.id,
          content: messageContent,
          messageType: "system",
        });
      }
    }

    return Response.json({ success: true, invoice: updated });
  } catch (error) {
    console.error("Invoice update error:", error);
    return Response.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}
