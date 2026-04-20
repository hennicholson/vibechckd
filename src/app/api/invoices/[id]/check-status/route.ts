import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, messages, transactions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getInvoice } from "@/lib/whop";
import { emails } from "@/lib/email";

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

    // Detect if ID is a UUID or a Whop ID (inv_...) and query accordingly
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let invoice;
    if (isUuid) {
      [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);
    }

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

    // If already paid, ensure transaction exists then return
    if ((invoice.status as string) === "paid") {
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
      return Response.json({ status: "paid", statusChanged: false });
    }

    if (!invoice.whopInvoiceId) {
      return Response.json({ error: "Invoice has no Whop ID" }, { status: 400 });
    }

    // Check with Whop -- try direct lookup, fall back to listing payments
    let whopStatus = "";
    try {
      const whopData = await getInvoice(invoice.whopInvoiceId);
      console.log("Whop getInvoice response:", JSON.stringify(whopData));
      const rawStatus = ((whopData.status as string) || "").toLowerCase();
      // Normalize various Whop status strings to "paid"
      if (rawStatus === "paid" || rawStatus === "succeeded" || rawStatus === "complete" || rawStatus === "completed") {
        whopStatus = "paid";
      } else {
        whopStatus = rawStatus;
      }
    } catch (err) {
      console.error("Whop getInvoice failed for", invoice.whopInvoiceId, "- full error:", err instanceof Error ? { message: err.message, stack: err.stack } : err);
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
          console.log("Whop payments fallback: found", payments.length, "payments, searching for invoice", invoice.whopInvoiceId);
          for (const p of payments) {
            console.log("Whop payment entry:", JSON.stringify({ id: p.id, status: p.status, invoice_id: p.invoice_id, metadata: p.metadata, checkout_configuration: p.checkout_configuration }));
            const matchesInvoice =
              p.invoice_id === invoice.whopInvoiceId ||
              p.metadata?.invoiceId === invoice.whopInvoiceId ||
              p.checkout_configuration?.metadata?.invoiceId === invoice.whopInvoiceId;
            const isPaid =
              p.status === "succeeded" || p.status === "paid" || p.status === "completed" || p.status === "complete";
            if (matchesInvoice && isPaid) {
              whopStatus = "paid";
              console.log("Whop payments fallback: matched payment", p.id, "with status", p.status);
              break;
            }
          }
        } else {
          console.error("Whop payments list failed:", res.status, await res.text());
        }
      } catch (fallbackErr) {
        console.error("Whop payments fallback error:", fallbackErr);
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

        // Fire-and-forget payment received email to the invoice sender (creator)
        const [senderUser] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, invoice.senderId))
          .limit(1);

        if (senderUser?.email) {
          const paidDisplayAmount = "$" + (invoice.amountCents / 100).toFixed(2);
          emails.paymentReceived(senderUser.email, paidDisplayAmount, invoice.description || "Invoice").catch(() => {});
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
