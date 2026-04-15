import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getInvoice } from "@/lib/whop";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.whopInvoiceId) {
      return Response.json({ error: "Invoice has no Whop ID" }, { status: 400 });
    }

    // Check with Whop
    const whopData = await getInvoice(invoice.whopInvoiceId);
    const whopStatus = whopData.status as string;

    let statusChanged = false;

    // If Whop says paid but our DB says sent, update our DB
    if (whopStatus === "paid" && invoice.status === "sent") {
      await db
        .update(invoices)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(invoices.id, id));

      statusChanged = true;

      // Post system message about payment
      if (invoice.projectId) {
        const displayAmount = (invoice.amountCents / 100).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

        await db.insert(messages).values({
          projectId: invoice.projectId,
          senderId: null,
          content: `INVOICE PAID\nInvoice for $${displayAmount} has been paid.\nDescription: ${invoice.description}`,
          messageType: "system",
        });
      }
    }

    return Response.json({
      status: statusChanged ? "paid" : invoice.status,
      whopStatus,
      statusChanged,
    });
  } catch (error) {
    console.error("Invoice check-status error:", error);
    const message = error instanceof Error ? error.message : "Failed to check invoice status";
    return Response.json({ error: message }, { status: 500 });
  }
}
