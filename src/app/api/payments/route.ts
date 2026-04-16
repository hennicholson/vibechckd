import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, users, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { recipientId, projectId, amountCents, description } = body;

    if (!recipientId || !amountCents || !description) {
      return Response.json(
        { error: "recipientId, amountCents, and description are required" },
        { status: 400 }
      );
    }

    if (amountCents <= 0) {
      return Response.json(
        { error: "amountCents must be positive" },
        { status: 400 }
      );
    }

    // Validate recipient exists
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!recipient) {
      return Response.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Convert cents to dollars for Whop API
    const amountDollars = amountCents / 100;

    // Create a placeholder transaction ID for metadata
    const tempId = crypto.randomUUID();

    // Create checkout session via Whop
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
    const redirectPath = projectId ? `/dashboard/projects/${projectId}` : "/dashboard/earnings";
    const checkout = await createCheckoutSession({
      amount: amountDollars,
      description,
      metadata: { transactionId: tempId },
      redirectUrl: `${baseUrl}${redirectPath}`,
    });

    // Insert transaction record
    const [transaction] = await db
      .insert(transactions)
      .values({
        id: tempId,
        userId: recipientId,
        projectId: projectId || null,
        invoiceId: null,
        type: "direct_payment",
        status: "pending",
        amountCents,
        description,
        whopCheckoutId: checkout.id,
        paymentUrl: checkout.purchaseUrl,
        senderId: session.user.id,
      })
      .returning();

    // Post system message to project chat if projectId provided
    if (projectId) {
      const displayAmount = (amountCents / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Get sender name
      const [senderUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      const senderName = senderUser?.name || "Someone";
      const recipientName = recipient.name || "a team member";

      let messageContent = `DIRECT PAYMENT\nFrom: ${senderName}\nTo: ${recipientName}\nAmount: $${displayAmount}\nDescription: ${description}\nStatus: Pending\nTransaction ID: ${tempId}`;
      if (checkout.purchaseUrl) {
        messageContent += `\nPay: ${checkout.purchaseUrl}`;
      }

      await db.insert(messages).values({
        projectId,
        senderId: session.user.id,
        content: messageContent,
        messageType: "system",
        fileUrl: null,
      });
    }

    return Response.json({
      transactionId: transaction.id,
      paymentUrl: checkout.purchaseUrl,
    });
  } catch (error) {
    console.error("Payment creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create payment";
    return Response.json({ error: message }, { status: 500 });
  }
}
