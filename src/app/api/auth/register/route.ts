import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  users,
  coderProfiles,
  clientProfiles,
  emailVerificationTokens,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { emails } from "@/lib/email";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 24-hour email verification token window
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
// bcrypt silently truncates inputs >72 bytes — enforce explicitly so
// password "abcdefg..." (long) and "abcdefg..." + extra bytes don't end
// up hashing to the same digest.
const MAX_PASSWORD_BYTES = 72;
const MAX_NAME_LENGTH = 80;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
}

export async function POST(req: NextRequest) {
  try {
    // 5 attempts / 10 min / IP. Stops enumeration + brute-force credential
    // stuffing at the API boundary. (Module-scoped limiter is per-instance
    // — see src/lib/rate-limit.ts. Move to Redis before horizontal scale.)
    const rl = checkRateLimit(rateLimitKey(req, "register:ip"), 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const { name, email, password, role: requestedRole, onboarding } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (typeof name !== "string" || name.length < 1 || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: "Name must be 1–80 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const role = requestedRole === "client" ? "client" : "coder";

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
      return NextResponse.json(
        { error: "Password must be 72 bytes or fewer." },
        { status: 400 }
      );
    }

    // Existence check — but DO NOT leak the result. Returning a 409 for
    // existing emails enables enumeration. Instead, accept the request,
    // skip persistence, and send a "your account already exists" email
    // (best-effort). The caller sees the same success response either way.
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      // Fire a courtesy email; never block on it.
      emails
        .passwordReset(normalizedEmail, `${baseUrl()}/login`)
        .catch(() => {});
      return NextResponse.json({ success: true });
    }

    const passwordHash = await bcrypt.hash(password, 13);

    // Create user (emailVerified is intentionally left null; login is gated
    // on verification in src/lib/auth.ts).
    //
    // The unique email constraint can fire here under concurrency even
    // though the existence check passed — catch it and return the same
    // success shape to avoid leaking existence.
    let user: typeof users.$inferSelect;
    try {
      const inserted = await db
        .insert(users)
        .values({
          name,
          email: normalizedEmail,
          passwordHash,
          role,
        })
        .returning();
      user = inserted[0];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return NextResponse.json({ success: true });
      }
      throw err;
    }

    // Create coder profile only for coders
    if (role === "coder") {
      // Generate slug from name, handling edge cases
      let baseSlug = (name || "coder")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!baseSlug) {
        baseSlug = "coder";
      }

      // Check for duplicate slugs and append random suffix if needed
      let slug = baseSlug;
      const [existingSlug] = await db
        .select()
        .from(coderProfiles)
        .where(eq(coderProfiles.creatorSlug, slug))
        .limit(1);

      if (existingSlug) {
        const suffix = Math.random().toString(36).substring(2, 6);
        slug = `${baseSlug}-${suffix}`;
      }

      // Extract onboarding data for coder profile
      const specialties = onboarding?.specialties || [];
      const websiteUrl = onboarding?.portfolioUrl || null;
      const experience =
        typeof onboarding?.experience === "string" && onboarding.experience.trim()
          ? onboarding.experience.trim()
          : null;

      await db.insert(coderProfiles).values({
        userId: user.id,
        creatorSlug: slug,
        status: "draft",
        specialties: specialties.length > 0 ? specialties : null,
        websiteUrl,
        experience,
      });
    }

    // Create client profile for clients
    if (role === "client") {
      await db.insert(clientProfiles).values({
        userId: user.id,
        companyName: onboarding?.companyName || null,
        projectTypes: onboarding?.projectType ? [onboarding.projectType] : null,
        budgetRange: onboarding?.budget || null,
        description: onboarding?.projectDescription || null,
      });
    }

    // Issue an email verification token and fire the verification email
    // non-blockingly. The token is 32 random bytes (64 hex chars); only the
    // sha256 hash is persisted server-side.
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

    // Fire-and-forget — do not block the response on email delivery.
    emails.emailVerification(normalizedEmail, verifyUrl).catch(() => {});

    // Do NOT return userId — it would let enumeration callers distinguish
    // success from the "email already exists" short-circuit above.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
