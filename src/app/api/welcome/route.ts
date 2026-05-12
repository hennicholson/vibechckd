import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { ensureCoderProfile } from "@/lib/whop-auth";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseBody, z } from "@/lib/validation";
import { emails } from "@/lib/email";

// First-run completion endpoint. Whop SSO creates accounts with a placeholder
// email (`whop_<id>@vibechckd.local`), no password, and a temporary
// `role: "client"`. This endpoint lets the user pick their real role
// (client vs creator), set an email + password, and — if they picked creator —
// kick off the coder vetting workflow by ensuring a draft coderProfiles row.
//
// IMPORTANT: the linked email is NOT auto-verified. Whop SSO proves control
// of the Whop account, not the typed-in personal email — a typo or impostor
// could otherwise claim someone else's address. We issue a verification token
// and email; until the user clicks the link, they can keep using Whop SSO but
// can't sign in via /login outside Whop. This matches the standalone-register
// path.
const welcomeSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(200),
    role: z.enum(["client", "coder"]),
  })
  .strict();

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(welcomeSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { email, password, role } = parsed.data;

  // Make sure no other user already owns this email.
  const [collision] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, session.user.id)))
    .limit(1);
  if (collision) {
    return NextResponse.json(
      { error: "That email is already in use" },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 13);
  await db
    .update(users)
    .set({
      email,
      passwordHash: hash,
      role,
      // Intentionally NULL — verification link below proves ownership.
      emailVerified: null,
    })
    .where(eq(users.id, session.user.id));

  // Replace any existing token for this user so a previous link can't be
  // reused. Then issue a fresh single-use token.
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, session.user.id));

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await db.insert(emailVerificationTokens).values({
    userId: session.user.id,
    tokenHash,
    email,
    expiresAt,
  });

  const verifyUrl = `${baseUrl()}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;

  // Fire-and-forget — don't block the response on email delivery.
  emails.emailVerification(email, verifyUrl).catch(() => {});

  // Creator path → trigger the existing vetting workflow by seeding a draft
  // coderProfiles row. Idempotent.
  if (role === "coder") {
    await ensureCoderProfile(session.user.id);
  }

  return NextResponse.json({
    success: true,
    verificationSent: true,
    email,
  });
}
