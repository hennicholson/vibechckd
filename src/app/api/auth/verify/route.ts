import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const bodySchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = parseBody(bodySchema, raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const tokenHash = hashToken(parsed.data.token);

    // Look up the token record by its hash and the accompanying email. The
    // email constraint defends against a token being presented with the wrong
    // address — must be an exact, case-insensitive match.
    const [stored] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          eq(emailVerificationTokens.email, normalizedEmail)
        )
      )
      .limit(1);

    if (!stored) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 }
      );
    }

    if (stored.expiresAt < new Date()) {
      // Clean up the stale row so a later resend has a clean slot.
      await db
        .delete(emailVerificationTokens)
        .where(eq(emailVerificationTokens.id, stored.id));
      return NextResponse.json(
        { error: "This verification link has expired. Request a new one." },
        { status: 400 }
      );
    }

    // Defensive: confirm the user still exists and the email matches.
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!user || user.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "Invalid verification link" },
        { status: 400 }
      );
    }

    // Mark the account as verified (idempotent — setting it again is harmless)
    // and consume the token. Tokens are single-use.
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, user.id));

    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, stored.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email verify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
