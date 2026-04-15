import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, asc, like } from "drizzle-orm";
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

    // Create the invoice via Whop API
    const invoice = await createInvoice({
      customerEmail: customerEmail || "",
      customerName: customerName || "",
      description,
      amount: Math.round(amount),
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      lineItems,
    });

    // Format amount for display
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
