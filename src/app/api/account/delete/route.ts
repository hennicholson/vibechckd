import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  withdrawals,
  transactions,
  invoiceSplits,
  invoices,
  applications,
  directMessages,
  directMessageParticipants,
  messages,
  tasks,
  deliverables,
  projectMembers,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseBody, z } from "@/lib/validation";

// Delete the authenticated user's account. Requires proof of possession via
// currentPassword AND a literal "DELETE" confirmation string to guard against
// accidental / automated submissions.
const deleteSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    confirm: z.literal("DELETE"),
  })
  .strict();

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(deleteSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { currentPassword } = parsed.data;

  // Load the user record — we need the password hash for verification.
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const userId = user.id;

  // ── Block deletion if the account has unresolved financial activity ──
  // Pending withdrawals represent real money in flight — the user must
  // resolve these before we can safely tear down the account.
  const pendingWithdrawals = await db
    .select({ id: withdrawals.id, amountCents: withdrawals.amountCents })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, userId), eq(withdrawals.status, "pending")));

  if (pendingWithdrawals.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete account with pending withdrawals",
        blocking: {
          pendingWithdrawals: pendingWithdrawals.length,
        },
      },
      { status: 400 }
    );
  }

  // Pending transactions (invoice payments still processing) are also
  // blocking because they represent state that must resolve before we can
  // detach the user without losing financial accountability.
  const pendingTx = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.status, "pending"))
    );

  if (pendingTx.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete account with pending transactions",
        blocking: {
          pendingTransactions: pendingTx.length,
        },
      },
      { status: 400 }
    );
  }

  // ── Cascade cleanup ──
  // Schema-level onDelete:"cascade" is configured on: accounts, sessions,
  // coderProfiles, clientProfiles, directMessageParticipants, projectMembers
  // (via users), and downstream content (portfolioItems, portfolioAssets via
  // coderProfile cascade). Other tables reference users without a cascade —
  // we clean those up explicitly here, in FK-safe order.
  //
  // For tables with nullable user references that represent historical
  // authorship (messages, invoices, tasks, deliverables, applications) we
  // null-out the reference rather than delete the row, so surviving project
  // data stays intact. For tables where the user reference is NOT NULL
  // (directMessages.senderId, invoiceSplits.userId, transactions.userId,
  // withdrawals.userId) we delete the row.

  // Null-out historical references (nullable FKs without cascade).
  await db
    .update(messages)
    .set({ senderId: null })
    .where(eq(messages.senderId, userId));

  await db
    .update(tasks)
    .set({ assignedTo: null })
    .where(eq(tasks.assignedTo, userId));

  await db
    .update(deliverables)
    .set({ submittedBy: null })
    .where(eq(deliverables.submittedBy, userId));

  await db
    .update(applications)
    .set({ userId: null })
    .where(eq(applications.userId, userId));

  await db
    .update(invoices)
    .set({ senderId: null })
    .where(eq(invoices.senderId, userId));

  await db
    .update(invoices)
    .set({ recipientId: null })
    .where(eq(invoices.recipientId, userId));

  await db
    .update(transactions)
    .set({ senderId: null })
    .where(eq(transactions.senderId, userId));

  // Delete rows with NOT NULL FKs that can't be preserved.
  // Direct messages authored by the user — FK senderId is NOT NULL.
  await db.delete(directMessages).where(eq(directMessages.senderId, userId));

  // Invoice splits addressed to the user — NOT NULL FK.
  await db.delete(invoiceSplits).where(eq(invoiceSplits.userId, userId));

  // Non-pending transactions tied to the user — delete historical record.
  await db.delete(transactions).where(eq(transactions.userId, userId));

  // Non-pending withdrawals — delete historical record.
  await db.delete(withdrawals).where(eq(withdrawals.userId, userId));

  // directMessageParticipants & projectMembers have cascade → users, but we
  // proactively delete to make intent explicit (idempotent; cascades handle
  // the rest if schema diverges).
  await db
    .delete(directMessageParticipants)
    .where(eq(directMessageParticipants.userId, userId));

  await db.delete(projectMembers).where(eq(projectMembers.userId, userId));

  // Finally delete the user row. onDelete:"cascade" on accounts, sessions,
  // coderProfiles, clientProfiles takes care of the rest of the tree.
  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
