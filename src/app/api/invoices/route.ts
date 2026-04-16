import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, invoiceSplits, messages, projectMembers, users } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { createInvoice } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      description,
      amount,
      dueDate,
      lineItems,
      projectId,
      splits,
      recipientEmail,
    } = body;

    if (!projectId || !description || !amount) {
      return Response.json(
        { error: "projectId, description, and amount are required" },
        { status: 400 }
      );
    }

    // SECURITY: Validate amount is a positive integer (cents)
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      return Response.json(
        { error: "amount must be a positive integer (cents)" },
        { status: 400 }
      );
    }

    // SECURITY: Verify the user is a member of this project
    const [senderMembership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!senderMembership) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up the other project member's email and ID if not provided
    let email = recipientEmail || customerEmail || "";
    let name = customerName || "";
    let recipientId: string | null = null;

    if (projectId) {
      try {
        const members = await db
          .select({ id: users.id, email: users.email, name: users.name })
          .from(projectMembers)
          .innerJoin(users, eq(projectMembers.userId, users.id))
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              ne(projectMembers.userId, session.user.id)
            )
          )
          .limit(1);

        if (members.length > 0) {
          recipientId = members[0].id;
          email = email || members[0].email;
          name = name || members[0].name || "";
        }
      } catch {
        // If lookup fails, save as draft
      }
    }

    // Create the invoice via Whop API
    // Chat sends amount in cents (e.g. 2500 = $25.00)
    // Whop API expects dollars in initial_price (e.g. 25 = $25.00)
    const amountDollars = amount / 100;
    const saveDraft = !email;
    const whopInvoice = await createInvoice({
      customerEmail: email,
      customerName: name,
      description,
      amount: amountDollars,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: lineItems?.map((li: any) => ({ ...li, unitPrice: li.unitPrice / 100 })),
      saveDraft,
    });

    // Format amount for display (amount comes in as cents from chat)
    const displayAmount = (amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const displayDue = dueDate || "Upon receipt";

    // Get sender name for the message
    const [senderUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const senderName = senderUser?.name || "Someone";
    const recipientName = name || "the client";

    // Build the system message content
    let messageContent = `INVOICE SENT\nFrom: ${senderName}\nTo: ${recipientName}\nDescription: ${description}\nAmount: $${displayAmount}\nDue: ${displayDue}\nStatus: Sent\nInvoice ID: ${whopInvoice.id}`;

    if (whopInvoice.paymentUrl) {
      messageContent += `\nPay: ${whopInvoice.paymentUrl}`;
    }

    // Insert system message into the project chat
    const [chatMessage] = await db
      .insert(messages)
      .values({
        projectId,
        senderId: session.user.id,
        content: messageContent,
        messageType: "system",
        fileUrl: null,
      })
      .returning();

    // Persist invoice to the invoices table
    const [invoice] = await db
      .insert(invoices)
      .values({
        projectId,
        whopInvoiceId: whopInvoice.id,
        senderId: session.user.id,
        recipientId,
        description,
        amountCents: amount,
        status: saveDraft ? "draft" : "sent",
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentUrl: whopInvoice.paymentUrl || null,
        messageId: chatMessage.id,
      })
      .returning();

    // Insert splits if provided
    let insertedSplits: typeof invoiceSplits.$inferSelect[] = [];
    if (splits && Array.isArray(splits) && splits.length > 0) {
      insertedSplits = await db
        .insert(invoiceSplits)
        .values(
          splits.map((s: { userId: string; amountCents: number }) => ({
            invoiceId: invoice.id,
            userId: s.userId,
            amountCents: s.amountCents,
          }))
        )
        .returning();
    }

    return Response.json({
      success: true,
      invoiceId: whopInvoice.id,
      paymentUrl: whopInvoice.paymentUrl,
      messageId: chatMessage.id,
      invoice,
      splits: insertedSplits,
    });
  } catch (error) {
    console.error("Invoice creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create invoice";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  // SECURITY: Verify the requesting user is a member of this project
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, projectId))
    .orderBy(desc(invoices.createdAt));

  return Response.json(rows);
}
