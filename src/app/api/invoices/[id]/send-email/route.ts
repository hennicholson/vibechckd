import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendInvoice } from "@/lib/whop";

export async function POST(
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
    const { email: emailOverride } = body;

    // Fetch the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Must be the sender
    if (invoice.senderId !== session.user.id) {
      return Response.json({ error: "Only the sender can send invoice emails" }, { status: 403 });
    }

    if (!invoice.whopInvoiceId) {
      return Response.json({ error: "Invoice has no Whop ID" }, { status: 400 });
    }

    // Determine recipient email
    let recipientEmail = emailOverride;
    if (!recipientEmail && invoice.recipientId) {
      const [recipient] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, invoice.recipientId))
        .limit(1);
      recipientEmail = recipient?.email;
    }

    if (!recipientEmail) {
      return Response.json(
        { error: "No recipient email available. Provide one in the request body." },
        { status: 400 }
      );
    }

    // Send via Whop
    await sendInvoice(invoice.whopInvoiceId, recipientEmail);

    // Update status to sent if it was draft
    if (invoice.status === "draft") {
      await db
        .update(invoices)
        .set({ status: "sent" })
        .where(eq(invoices.id, id));
    }

    return Response.json({ success: true, sentTo: recipientEmail });
  } catch (error) {
    console.error("Invoice send-email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send invoice email";
    return Response.json({ error: message }, { status: 500 });
  }
}
