import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, users, messages, projectMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession } from "@/lib/whop";
import { parseBody, z } from "@/lib/validation";

// Strict schema: the sender is ALWAYS session.user.id. Never accept sender from body.
// amountCents is bounded to prevent Whop-side / integer-overflow abuse.
// projectId is REQUIRED — direct payments must be tied to an active project both
// parties belong to. Closes the unsolicited-payment surface (anyone-can-pay-anyone).
const paymentSchema = z
  .object({
    recipientId: z.string().uuid(),
    projectId: z.string().uuid(),
    amountCents: z.number().int().positive().max(10_000_000), // $100k cap
    description: z.string().min(1).max(500),
  })
  .strict();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = parseBody(paymentSchema, rawBody);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error },
        { status: 400 }
      );
    }
    const { recipientId, projectId, amountCents, description } = parsed.data;

    // A user cannot pay themselves.
    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot send a payment to yourself" },
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
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Confirm BOTH parties belong to the project. projectId is required
    // by the schema, so this branch always runs.
    const memberships = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const memberSet = new Set(memberships.map((m) => m.userId));
    if (!memberSet.has(session.user.id) || !memberSet.has(recipientId)) {
      return NextResponse.json(
        { error: "Forbidden: both parties must be project members" },
        { status: 403 }
      );
    }

    // Convert cents to dollars for Whop API
    const amountDollars = amountCents / 100;

    // Create a placeholder transaction ID for metadata
    const tempId = crypto.randomUUID();

    // Create checkout session via Whop
    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
    const checkout = await createCheckoutSession({
      amount: amountDollars,
      description,
      metadata: { transactionId: tempId },
      redirectUrl: `${baseUrl}/dashboard/projects/${projectId}`,
    });

    // Insert transaction record (sender is always session.user.id)
    const [transaction] = await db
      .insert(transactions)
      .values({
        id: tempId,
        userId: recipientId,
        projectId,
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

    // Post system message to project chat
    {
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

    return NextResponse.json({
      transactionId: transaction.id,
      paymentUrl: checkout.purchaseUrl,
    });
  } catch (error) {
    console.error("Payment creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

