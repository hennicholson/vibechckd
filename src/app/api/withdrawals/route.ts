import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  coderProfiles,
  transactions,
  withdrawals,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  createConnectedAccount,
  createPayoutTransfer,
} from "@/lib/whop";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let withdrawalId: string | null = null;
  let transactionId: string | null = null;

  try {
    const body = await request.json();
    const { amountCents } = body;

    if (!amountCents || typeof amountCents !== "number" || amountCents <= 0) {
      return Response.json(
        { error: "amountCents must be a positive integer" },
        { status: 400 }
      );
    }

    // Get user info (need email and name for connected account creation)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // RACE CONDITION WARNING: The balance check and transaction insert below are
    // NOT atomic. Two concurrent withdrawal requests could both pass the balance
    // check and overdraw the account. A proper solution would use a database
    // transaction with SELECT ... FOR UPDATE to lock the balance rows. With
    // neon-http (serverless), true DB transactions require the websocket driver.

    // Compute available balance from completed transactions
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

    // Check if user has a connected Whop company (check coderProfiles first, then users)
    let whopCompanyId: string | null = null;

    const [profile] = await db
      .select({ whopCompanyId: coderProfiles.whopCompanyId })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, userId))
      .limit(1);

    whopCompanyId = profile?.whopCompanyId ?? user.whopCompanyId ?? null;

    // If no connected account exists, create one
    if (!whopCompanyId) {
      const result = await createConnectedAccount({
        email: user.email,
        name: user.name || user.email,
        internalUserId: userId,
      });
      whopCompanyId = result.companyId;

      // Save to coderProfiles if profile exists, otherwise save to users table
      if (profile) {
        await db
          .update(coderProfiles)
          .set({ whopCompanyId })
          .where(eq(coderProfiles.userId, userId));
      } else {
        await db
          .update(users)
          .set({ whopCompanyId })
          .where(eq(users.id, userId));
      }
    }

    const idempotencyKey = crypto.randomUUID();
    const amountDollars = amountCents / 100;

    // Insert withdrawal record with status "pending"
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId,
        amountCents,
        status: "pending",
      })
      .returning();
    withdrawalId = withdrawal.id;

    // Insert transaction record with NEGATIVE amountCents, status "pending"
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
    transactionId = transaction.id;

    // Execute the payout transfer via Whop
    const transferResult = await createPayoutTransfer({
      destinationCompanyId: whopCompanyId,
      amountDollars,
      description: "Withdrawal",
      idempotencyKey,
    });

    // Update withdrawal and transaction to "completed"
    await db
      .update(withdrawals)
      .set({
        status: "completed",
        whopWithdrawalId: transferResult.id,
        completedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawal.id));

    await db
      .update(transactions)
      .set({
        status: "completed",
        whopTransferId: transferResult.id,
        completedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));

    return Response.json({
      withdrawalId: withdrawal.id,
      transactionId: transaction.id,
      status: "completed",
      feeAmount: transferResult.feeAmount,
    });
  } catch (error) {
    console.error("Withdrawal failed:", error);

    // If we already created DB records, mark them as failed
    const failureReason =
      error instanceof Error ? error.message : "Unknown error";

    if (withdrawalId) {
      await db
        .update(withdrawals)
        .set({ status: "failed", failureReason })
        .where(eq(withdrawals.id, withdrawalId))
        .catch((e) => console.error("Failed to update withdrawal status:", e));
    }

    if (transactionId) {
      await db
        .update(transactions)
        .set({ status: "failed" })
        .where(eq(transactions.id, transactionId))
        .catch((e) =>
          console.error("Failed to update transaction status:", e)
        );
    }

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
