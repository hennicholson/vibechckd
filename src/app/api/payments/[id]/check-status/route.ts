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

    console.log("Payment check-status: looking up checkout", transaction.whopCheckoutId, "for transaction", transaction.id);

    const res = await fetch(
      `${WHOP_BASE_URL}/checkout_configurations/${transaction.whopCheckoutId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    let checkoutData: Record<string, unknown> | null = null;
    if (res.ok) {
      checkoutData = await res.json();
      console.log("Payment check-status: checkout config response:", JSON.stringify(checkoutData));

      // Check if the checkout config itself indicates completion
      const configStatus = (((checkoutData as Record<string, unknown>).status as string) || "").toLowerCase();
      if (configStatus === "succeeded" || configStatus === "completed" || configStatus === "paid") {
        console.log("Payment check-status: checkout config status is", configStatus, "- marking completed");
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
    } else {
      console.log("Payment check-status: checkout config lookup failed:", res.status, await res.text());
    }

    // Fall back to listing payments for this company to find a match
    const paymentsRes = await fetch(
      `${WHOP_BASE_URL}/payments?company_id=${process.env.WHOP_COMPANY_ID || ""}&limit=20`,
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
      console.log("Payment check-status: listing", payments.length, "payments to find match for checkout", transaction.whopCheckoutId);

      for (const payment of payments) {
        console.log("Payment check-status: payment entry:", JSON.stringify({
          id: payment.id,
          status: payment.status,
          checkout_configuration_id: payment.checkout_configuration_id,
          metadata: payment.metadata,
        }));

        const matchesCheckout =
          payment.checkout_configuration_id === transaction.whopCheckoutId;
        const matchesMeta =
          payment.metadata?.transactionId === transaction.id;
        const matchesId =
          payment.id === transaction.whopCheckoutId;

        const isPaid =
          payment.status === "succeeded" ||
          payment.status === "completed" ||
          payment.status === "paid";

        if ((matchesCheckout || matchesMeta || matchesId) && isPaid) {
          console.log("Payment check-status: matched payment", payment.id, "via", matchesCheckout ? "checkoutId" : matchesMeta ? "metadata" : "directId");

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
    } else {
      console.log("Payment check-status: payments list failed:", paymentsRes.status);
    }

    return Response.json({
      status: transaction.status,
      changed: false,
      checkoutStatus: checkoutData ? (checkoutData as Record<string, unknown>).status || "unknown" : "lookup_failed",
    });
  } catch (error) {
    console.error("Payment check-status error:", error);
    return Response.json({ error: "Failed to check status" }, { status: 500 });
  }
}
