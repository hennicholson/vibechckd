import { NextResponse } from "next/server";
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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 24-hour email verification token window
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
}

export async function POST(req: Request) {
  try {
    const { name, email, password, role: requestedRole, onboarding } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const role = requestedRole === "client" ? "client" : "coder";

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if user exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 13);

    // Create user (emailVerified is intentionally left null; login is gated
    // on verification in src/lib/auth.ts).
    const [user] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
      })
      .returning();

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

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
