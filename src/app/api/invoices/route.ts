import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, projectMembers, users } from "@/db/schema";
import { eq, asc, and, ne } from "drizzle-orm";
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
    } = body;

    if (!projectId || !description || !amount) {
      return Response.json(
        { error: "projectId, description, and amount are required" },
        { status: 400 }
      );
    }

    // Look up the other project member's email if not provided
    let email = customerEmail || "";
    let name = customerName || "";

    if (!email && projectId) {
      try {
        const members = await db
          .select({ email: users.email, name: users.name })
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
          email = members[0].email;
          name = name || members[0].name || "";
        }
      } catch {
        // If lookup fails, save as draft
      }
    }

    // Create the invoice via Whop API
    // Chat sends amount in cents (e.g. 2500 = $25.00)
    // Whop API expects dollars in initial_price (e.g. 25 = $25.00)
    const amountDollars = Math.round(amount / 100);
    const saveDraft = !email;
    const invoice = await createInvoice({
      customerEmail: email,
      customerName: name,
      description,
      amount: amountDollars,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: lineItems?.map((li: any) => ({ ...li, unitPrice: Math.round(li.unitPrice / 100) })),
      saveDraft,
    });

    // Format amount for display (amount comes in as cents from chat)
    const displayAmount = (amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const displayDue = dueDate || "Upon receipt";

    // Build the system message content
    let messageContent = `\u{1F4B0} INVOICE SENT\nDescription: ${description}\nAmount: $${displayAmount}\nDue: ${displayDue}\nStatus: Sent\nInvoice ID: ${invoice.id}`;

    if (invoice.paymentUrl) {
      messageContent += `\nPay: ${invoice.paymentUrl}`;
    }

    // Insert system message into the project chat
    const [created] = await db
      .insert(messages)
      .values({
        projectId,
        senderId: session.user.id,
        content: messageContent,
        messageType: "system",
        fileUrl: null,
      })
      .returning();

    return Response.json({
      success: true,
      invoiceId: invoice.id,
      paymentUrl: invoice.paymentUrl,
      messageId: created.id,
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

  // Query messages that contain "INVOICE" in content
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));

  const invoiceMessages = rows.filter(
    (row) => row.content && row.content.includes("INVOICE")
  );

  return Response.json(invoiceMessages);
}
