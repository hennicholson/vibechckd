import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Available balance: sum of all completed transactions
    const [available] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed")
        )
      );

    // Pending incoming: sum of pending positive transactions
    const [pending] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "pending"),
          sql`${transactions.amountCents} > 0`
        )
      );

    // Total earned: sum of completed positive transactions
    const [earned] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed"),
          sql`${transactions.amountCents} > 0`
        )
      );

    // Total withdrawn: absolute sum of completed withdrawal transactions
    const [withdrawn] = await db
      .select({
        total: sql<number>`coalesce(abs(sum(${transactions.amountCents})), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "completed"),
          eq(transactions.type, "withdrawal")
        )
      );

    return Response.json({
      availableCents: Number(available.total),
      pendingCents: Number(pending.total),
      totalEarnedCents: Number(earned.total),
      totalWithdrawnCents: Number(withdrawn.total),
    });
  } catch (error) {
    console.error("Balance fetch failed:", error);
    return Response.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
