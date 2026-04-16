import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, messages, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Try lookup by internal UUID first, then by Whop invoice ID
    let [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.whopInvoiceId, id))
        .limit(1);
    }

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    // If already paid, return immediately
    if (invoice.status === "paid") {
      return Response.json({ status: "paid", statusChanged: false });
    }

    if (!invoice.whopInvoiceId) {
      return Response.json({ error: "Invoice has no Whop ID" }, { status: 400 });
    }

    // Check with Whop -- try direct lookup, fall back to listing payments
    let whopStatus = "";
    try {
      const whopData = await getInvoice(invoice.whopInvoiceId);
      whopStatus = ((whopData.status as string) || "").toLowerCase();
    } catch (err) {
      console.error("Whop getInvoice failed:", err);
      // Try listing recent payments to find a match
      try {
        const apiKey = process.env.WHOP_API_KEY;
        const companyId = process.env.WHOP_COMPANY_ID || "";
        const res = await fetch(
          `https://api.whop.com/api/v1/payments?company_id=${companyId}&limit=20`,
          { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          const payments = data.data || data || [];
          for (const p of payments) {
            if (p.invoice_id === invoice.whopInvoiceId && p.status === "succeeded") {
              whopStatus = "paid";
              break;
            }
          }
        }
      } catch {
        // Silent fallback failure
      }
    }

    let statusChanged = false;

    // If Whop says paid/succeeded but our DB doesn't, update
    const currentStatus = invoice.status as string;
    if ((whopStatus === "paid" || whopStatus === "succeeded" || whopStatus === "completed") && currentStatus !== "paid") {
      await db
        .update(invoices)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(invoices.id, invoice.id));

      statusChanged = true;

      // Post system message
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

      // Create transaction record for the creator's balance (idempotent)
      if (invoice.senderId) {
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
