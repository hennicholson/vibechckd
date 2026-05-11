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
  generatePayoutPortalLink,
} from "@/lib/whop";
import { emails } from "@/lib/email";
import { parseBody, z } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

// Hard cap matches Whop's per-transfer ceiling and the audit's $100k
// recommendation. Lets us reject obviously-bogus loop inputs before
// the atomic balance check fires.
const withdrawalSchema = z
  .object({
    amountCents: z.number().int().positive().max(10_000_000),
  })
  .strict();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 5 withdrawal attempts per minute per user. The atomic balance function
  // is already safe under concurrency, but rate-limiting stops a malicious
  // loop from hammering Whop's API (and our logs) with rejected requests.
  const rl = checkRateLimit(`withdrawals:${userId}`, 5, 60_000);
  if (!rl.allowed) {
    return Response.json(
      { error: "Too many withdrawal attempts. Try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let withdrawalId: string | null = null;
  let transactionId: string | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    const validated = parseBody(withdrawalSchema, rawBody);
    if (!validated.ok) {
      return Response.json(
        { error: "Invalid input", details: validated.error },
        { status: 400 }
      );
    }
    const { amountCents } = validated.data;

    // Get user info (need email and name for connected account creation)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Atomic balance check + pending withdrawal transaction insert.
    // `request_withdrawal()` (drizzle/0013_atomic_withdrawal_fn.sql) holds a
    // FOR UPDATE lock on the user's transaction rows so two concurrent calls
    // can't both pass the balance check. RAISES sqlstate P0001 with message
    // 'insufficient_balance' on overdraw — caught + returned as 400 below.
    let pendingTxId: string;
    try {
      const result = (await db.execute(
        sql`SELECT request_withdrawal(${userId}::uuid, ${amountCents}::int) AS id`
      )) as unknown as { rows: Array<{ id: string }> };
      pendingTxId = result.rows[0].id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("insufficient_balance")) {
        return Response.json(
          {
            error: "Insufficient balance",
            requestedCents: amountCents,
          },
          { status: 400 }
        );
      }
      throw err;
    }
    transactionId = pendingTxId;

    // Pick the transfer destination.
    //
    // 1. SSO'd creators (signed in via Whop) → transfer directly to their
    //    whop_user_id. Funds land in their native Whop wallet — they manage
    //    payout methods on whop.com directly, no sub-company / portal needed.
    // 2. Native vibechckd creators → we provision (or reuse) a connected
    //    sub-company under our parent and surface a payouts portal link so
    //    they can hook up a bank/Venmo/CashApp.
    let destinationId: string | null = null;
    const isWhopUser = !!user.whopUserId;

    if (isWhopUser) {
      destinationId = user.whopUserId;
    } else {
      const [profile] = await db
        .select({ whopCompanyId: coderProfiles.whopCompanyId })
        .from(coderProfiles)
        .where(eq(coderProfiles.userId, userId))
        .limit(1);

      let whopCompanyId = profile?.whopCompanyId ?? user.whopCompanyId ?? null;

      if (!whopCompanyId) {
        const result = await createConnectedAccount({
          email: user.email,
          name: user.name || user.email,
          internalUserId: userId,
        });
        whopCompanyId = result.companyId;

        try {
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
        } catch (persistErr) {
          // The Whop sub-company exists but we couldn't store its id. Log so
          // it can be reconciled manually; abort the withdrawal cleanly.
          console.error(
            "ORPHAN whop sub-company — created but DB persist failed",
            { userId, whopCompanyId, err: persistErr }
          );
          throw new Error(
            "Could not save your payout account — please retry in a moment"
          );
        }
      }

      destinationId = whopCompanyId;
    }

    if (!destinationId) {
      throw new Error("Could not resolve a payout destination");
    }

    const amountDollars = amountCents / 100;

    // The pending withdrawal *transaction* row was already inserted by
    // request_withdrawal() (atomic). Insert the matching `withdrawals`
    // table row here for payout-method tracking.
    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId,
        amountCents,
        status: "pending",
      })
      .returning();
    withdrawalId = withdrawal.id;

    // Update the description on the auto-created transaction so it shows
    // the dollar amount the user can recognize, instead of the generic
    // 'Withdrawal request' the function inserted.
    await db
      .update(transactions)
      .set({ description: `Withdrawal of $${amountDollars.toFixed(2)}` })
      .where(eq(transactions.id, pendingTxId));

    // Use the durable withdrawal row id as the idempotence key so client
    // retries dedupe at Whop instead of double-charging.
    const transferResult = await createPayoutTransfer({
      destinationId,
      amountDollars,
      description: "Withdrawal",
      idempotencyKey: `withdrawal_${withdrawal.id}`,
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
      .where(eq(transactions.id, pendingTxId));

    // Only non-SSO creators need the connected-account payout portal.
    // SSO users withdraw via whop.com on their own wallet.
    let payoutPortalUrl: string | null = null;
    if (!isWhopUser) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
        payoutPortalUrl = await generatePayoutPortalLink({
          connectedCompanyId: destinationId,
          returnUrl: `${baseUrl}/dashboard/earnings`,
        });
      } catch (err) {
        console.error("Failed to generate payout portal link:", err);
        // Non-blocking -- transfer already succeeded
      }
    }

    // Fire-and-forget withdrawal confirmation email
    emails.withdrawalProcessed(user.email, "$" + amountDollars.toFixed(2)).catch(() => {});

    return Response.json({
      withdrawalId: withdrawal.id,
      transactionId: pendingTxId,
      status: "completed",
      feeAmount: transferResult.feeAmount,
      payoutPortalUrl,
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

    const rawMessage =
      error instanceof Error ? error.message : "Failed to create withdrawal";

    // Parse Whop-specific errors for user-friendly messages
    let userMessage = rawMessage;
    let statusCode = 500;

    if (rawMessage.includes("under review")) {
      userMessage = "Your payment account is currently under review by Whop. Withdrawals will be available once verification is complete. This usually takes 1-2 business days.";
      statusCode = 503;
    } else if (rawMessage.includes("insufficient") || rawMessage.includes("Insufficient") || rawMessage.includes("not enough")) {
      userMessage = "Your funds are still processing. Payments typically settle within 2-3 business days before they can be withdrawn. Please try again later.";
      statusCode = 400;
    } else if (rawMessage.includes("Transfer failed")) {
      const match = rawMessage.match(/"message":"([^"]+)"/);
      const whopMsg = match ? match[1] : "";
      if (whopMsg.includes("insufficient") || whopMsg.includes("not enough") || whopMsg.includes("balance")) {
        userMessage = "Your funds are still processing. Payments typically settle within 2-3 business days before they can be withdrawn.";
      } else {
        userMessage = whopMsg || "Transfer could not be completed. Please try again later.";
      }
      statusCode = 400;
    }

    return Response.json({ error: userMessage }, { status: statusCode });
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
