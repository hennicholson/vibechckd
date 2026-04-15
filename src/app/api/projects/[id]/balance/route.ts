import { auth } from "@/lib/auth";
import { db } from "@/db";
import { invoices, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project membership
    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return Response.json({ error: "Not a project member" }, { status: 403 });
    }

    // Fetch all invoices for this project
    const projectInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.projectId, id));

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    for (const inv of projectInvoices) {
      totalInvoiced += inv.amountCents;
      if (inv.status === "paid") {
        totalPaid += inv.amountCents;
      } else if (inv.status === "sent") {
        totalPending += inv.amountCents;
      } else if (inv.status === "past_due") {
        totalOverdue += inv.amountCents;
      }
    }

    return Response.json({
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      invoices: projectInvoices,
    });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return Response.json({ error: "Failed to load balance" }, { status: 500 });
  }
}
