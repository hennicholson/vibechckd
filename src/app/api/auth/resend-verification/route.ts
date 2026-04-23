import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emails } from "@/lib/email";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { parseBody, z } from "@/lib/validation";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
}

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = parseBody(bodySchema, raw);
    if (!parsed.ok) {
      // Preserve the "always succeed" enumeration-resistance contract even for
      // malformed input — return success but do nothing.
      return NextResponse.json({ success: true });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    // Enforce rate limits. If either is exceeded, we SKIP email dispatch but
    // still respond {success:true} — this prevents enumeration and abusive
    // resend-bombing of a target inbox.
    // 1. 3 requests per IP per 10 minutes
    const ipRl = checkRateLimit(
      rateLimitKey(req, "resend-verification:ip"),
      3,
      10 * 60 * 1000
    );
    // 2. 3 requests per email per hour
    const emailRl = checkRateLimit(
      `resend-verification:email:${normalizedEmail}`,
      3,
      60 * 60 * 1000
    );

    const shouldSend = ipRl.allowed && emailRl.allowed;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Only send if user exists AND is currently unverified.
    if (user && user.emailVerified === null && shouldSend) {
      // Replace any existing verification tokens for this user — we only want
      // one live token at a time so earlier links auto-invalidate.
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.userId, user.id));

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

      await db.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenHash,
        email: normalizedEmail,
        expiresAt,
      });

      const verifyUrl = `${baseUrl()}/verify-email?token=${rawToken}&email=${encodeURIComponent(
        normalizedEmail
      )}`;

      // Fire-and-forget — same pattern as registration.
      emails.emailVerification(normalizedEmail, verifyUrl).catch(() => {});
    }

    // Always 200 regardless of whether we actually dispatched — this is the
    // enumeration defence.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    // Even on internal error, don't leak. Log & return generic success.
    return NextResponse.json({ success: true });
  }
}
