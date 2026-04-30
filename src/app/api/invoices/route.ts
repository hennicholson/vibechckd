import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  invoiceSplits,
  messages,
  projectMembers,
  users,
  conversations,
} from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { createInvoice } from "@/lib/whop";
import { emails } from "@/lib/email";
import { parseBody, z } from "@/lib/validation";
import { publishConversationEvent } from "@/lib/conversation-bus";

// Local HTML escape helper — duplicated intentionally (src/lib/email.ts is
// owned by another agent and out-of-scope for this edit).
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const lineItemSchema = z
  .object({
    label: z.string().min(1).max(500),
    quantity: z.number().int().positive().max(10_000),
    unitPrice: z.number().int().nonnegative().max(10_000_000),
  })
  .strict();

const splitSchema = z
  .object({
    userId: z.string().uuid(),
    amountCents: z.number().int().positive().max(10_000_000),
  })
  .strict();

const invoicePostSchema = z
  .object({
    projectId: z.string().uuid(),
    description: z.string().min(1).max(2000),
    amount: z.number().int().positive().max(10_000_000), // cents
    dueDate: z.string().datetime().optional(),
    lineItems: z.array(lineItemSchema).max(50).optional(),
    splits: z.array(splitSchema).max(20).optional(),
    customerEmail: z.string().email().max(320).optional(),
    customerName: z.string().max(200).optional(),
    recipientEmail: z.string().email().max(320).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const validated = parseBody(invoicePostSchema, rawBody);
    if (!validated.ok) {
      return Response.json(
        { error: "Invalid input", details: validated.error },
        { status: 400 }
      );
    }
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
    } = validated.data;

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
      lineItems: lineItems?.map((li) => ({ ...li, unitPrice: li.unitPrice / 100 })),
      saveDraft,
    });

    // Format amount for display (amount comes in as cents from chat)
    const displayAmount = (amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Resolve the project's conversation. The 0012 backfill seeded one per
    // project; new projects are seeded by the project-creation flow. If
    // somehow missing, fall back to inserting a project conversation row
    // here so the invoice still posts (degraded but never blocked).
    let [projectConv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.projectId, projectId),
          eq(conversations.kind, "project")
        )
      )
      .limit(1);
    if (!projectConv) {
      const [created] = await db
        .insert(conversations)
        .values({ kind: "project", projectId })
        .returning({ id: conversations.id });
      projectConv = created;
    }
    const conversationId = projectConv.id;

    // Persist invoice first (no messageId yet — circular FK is filled in below).
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
        messageId: null,
      })
      .returning();

    // Insert a structured invoice message. Body is a one-line summary —
    // the rich card UI is rendered client-side from the `invoiceId` FK
    // join, no fragile text-parsing.
    const [chatMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        projectId,
        senderId: session.user.id,
        content: `Sent invoice: ${description} ($${displayAmount})`,
        messageType: "invoice",
        invoiceId: invoice.id,
      })
      .returning();

    // Stamp the message back onto the invoice so the audit link is bidirectional.
    await db
      .update(invoices)
      .set({ messageId: chatMessage.id })
      .where(eq(invoices.id, invoice.id));
    invoice.messageId = chatMessage.id;

    // Touch conversation.updated_at + fan out to SSE listeners.
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    publishConversationEvent({
      type: "message",
      messageId: chatMessage.id,
      conversationId,
    });

    // Insert splits if provided
    let insertedSplits: typeof invoiceSplits.$inferSelect[] = [];
    if (splits && splits.length > 0) {
      insertedSplits = await db
        .insert(invoiceSplits)
        .values(
          splits.map((s) => ({
            invoiceId: invoice.id,
            userId: s.userId,
            amountCents: s.amountCents,
          }))
        )
        .returning();
    }

    // Fire-and-forget invoice notification email.
    // Escape the description before sending — assumes the email template may
    // embed `description` in HTML without its own escaping.
    if (email) {
      const displayAmountEmail = "$" + (amount / 100).toFixed(2);
      const safeDescription = escapeHtml(description);
      emails
        .invoiceCreated(email, safeDescription, displayAmountEmail, whopInvoice.paymentUrl)
        .catch(() => {});
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
    const raw = error instanceof Error ? error.message : "Failed to create invoice";

    // Whop returns "Required permission: invoice:create" when the app's
    // Whop dashboard config doesn't include that scope. Surface a clearer
    // message + 503 (config error, not server bug) so the UI can show
    // "Configuration needed" rather than a generic 500.
    if (raw.includes("invoice:create")) {
      return Response.json(
        {
          error:
            "Whop permission missing. Add `invoice:create` to your app's permissions in the Whop developer dashboard, then reinstall the app.",
          code: "missing_invoice_permission",
        },
        { status: 503 }
      );
    }
    return Response.json({ error: raw }, { status: 500 });
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
