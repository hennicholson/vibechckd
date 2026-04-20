import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { emails } from "@/lib/email";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user — but always return success to avoid leaking user existence
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (user) {
      // Delete any existing reset tokens for this email
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, normalizedEmail));

      const rawToken = randomUUID();
      const hashedToken = hashToken(rawToken);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(verificationTokens).values({
        identifier: normalizedEmail,
        token: hashedToken,
        expires,
      });

      const resetUrl = `https://vibechckd.cc/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
      await emails.passwordReset(normalizedEmail, resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
