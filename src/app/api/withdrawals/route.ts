import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, withdrawals } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { createWhopWithdrawal } from "@/lib/whop";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amountCents } = body;

    if (!amountCents || amountCents <= 0) {
      return Response.json(
        { error: "amountCents must be a positive integer" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // SECURITY WARNING: Race condition risk. The balance check and withdrawal insert
    // are NOT atomic. Two concurrent withdrawal requests could both pass the balance
    // check and drain more than the available balance. With neon-http (serverless),
    // wrapping in a DB transaction is not straightforward. Mitigations:
    // 1. Use a neon-serverless (websocket) driver for real transactions, OR
    // 2. Add a unique pending-withdrawal constraint, OR
    // 3. Use SELECT ... FOR UPDATE in a transaction to lock the balance rows.

    // Compute available balance
    const [balance] = await db
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

    const availableCents = Number(balance.total);

    if (amountCents > availableCents) {
      return Response.json(
        {
          error: "Insufficient balance",
          availableCents,
          requestedCents: amountCents,
        },
        { status: 400 }
      );
    }

    // Convert to dollars for Whop API
    const amountDollars = amountCents / 100;

    // Create withdrawal via Whop
    const whopResult = await createWhopWithdrawal({
      amountDollars,
    });

    // Insert transaction (negative amount for debit)
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId,
        type: "withdrawal",
        status: "pending",
        amountCents: -amountCents,
        description: `Withdrawal of $${amountDollars.toFixed(2)}`,
      })
      .returning();

    // Insert withdrawal record
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId,
        amountCents,
        status: "pending",
        whopWithdrawalId: whopResult.id,
      })
      .returning();

    return Response.json({
      withdrawalId: withdrawal.id,
      transactionId: transaction.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Withdrawal failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create withdrawal";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, session.user.id))
      .orderBy(desc(withdrawals.requestedAt));

    return Response.json(rows);
  } catch (error) {
    console.error("Withdrawals fetch failed:", error);
    return Response.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}
