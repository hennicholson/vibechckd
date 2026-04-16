import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // Look up the transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!transaction) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "completed") {
      return Response.json({ status: "completed", changed: false });
    }

    if (!transaction.whopCheckoutId) {
      return Response.json({ error: "No checkout ID linked" }, { status: 400 });
    }

    // Check checkout config status with Whop
    const WHOP_BASE_URL = "https://api.whop.com/api/v1";
    const apiKey = process.env.WHOP_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Whop not configured" }, { status: 500 });
    }

    const res = await fetch(
      `${WHOP_BASE_URL}/checkout_configurations/${transaction.whopCheckoutId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      // Try listing payments for this company to find a match
      const paymentsRes = await fetch(
        `${WHOP_BASE_URL}/payments?company_id=${process.env.WHOP_COMPANY_ID || ""}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        const payments = paymentsData.data || paymentsData || [];

        // Try to find a payment matching our checkout config or metadata
        for (const payment of payments) {
          const matchesCheckout =
            payment.checkout_configuration_id === transaction.whopCheckoutId;
          const matchesMeta =
            payment.metadata?.transactionId === transaction.id;

          if ((matchesCheckout || matchesMeta) && payment.status === "succeeded") {
            // Found it -- mark as completed
            await db
              .update(transactions)
              .set({ status: "completed", completedAt: new Date() })
              .where(eq(transactions.id, transaction.id));

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

            return Response.json({ status: "completed", changed: true });
          }
        }
      }

      return Response.json({ status: transaction.status, changed: false });
    }

    // Check the checkout config for any completed payment info
    const configData = await res.json();

    // If we got here, the checkout config exists but we need to check
    // if any payment was made against it
    return Response.json({
      status: transaction.status,
      changed: false,
      checkoutStatus: configData.status || "unknown",
    });
  } catch (error) {
    console.error("Payment check-status error:", error);
    return Response.json({ error: "Failed to check status" }, { status: 500 });
  }
}
