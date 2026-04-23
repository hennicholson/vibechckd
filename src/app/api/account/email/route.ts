import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseBody, z } from "@/lib/validation";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

// Change the currently-authenticated user's email address. Requires proof of
// possession via currentPassword. On success the email is updated and
// emailVerified is cleared — a sibling flow (owned by another agent) handles
// re-verification dispatch. We return `needsReverification: true` so the
// client can surface that and sign the user out.
const emailChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newEmail: z.string().email().max(320),
  })
  .strict();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit both by IP and by user id. 3/hour each.
  const ipRl = checkRateLimit(
    rateLimitKey(request, "account-email:ip"),
    3,
    60 * 60 * 1000
  );
  const userRl = checkRateLimit(
    `account-email:user:${session.user.id}`,
    3,
    60 * 60 * 1000
  );
  if (!ipRl.allowed || !userRl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(emailChangeSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }

  const { currentPassword } = parsed.data;
  const newEmail = parsed.data.newEmail.trim().toLowerCase();

  // Load user to verify password and compare current email.
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
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

  if (user.email.toLowerCase() === newEmail) {
    return NextResponse.json(
      { error: "New email is the same as the current email" },
      { status: 400 }
    );
  }

  // Uniqueness check — cheap and race-benign; DB-level unique constraint is
  // the source of truth, we pre-check for a nicer error message.
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, newEmail))
    .limit(1);

  if (taken) {
    return NextResponse.json(
      { error: "That email is already in use" },
      { status: 409 }
    );
  }

  try {
    await db
      .update(users)
      .set({ email: newEmail, emailVerified: null })
      .where(eq(users.id, session.user.id));
  } catch (err) {
    // Unique violation race condition fallback.
    console.error("Email change failed:", err);
    return NextResponse.json(
      { error: "That email is already in use" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, needsReverification: true });
}
