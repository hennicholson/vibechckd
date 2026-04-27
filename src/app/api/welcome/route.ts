import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureCoderProfile } from "@/lib/whop-auth";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseBody, z } from "@/lib/validation";

// First-run completion endpoint. Whop SSO creates accounts with a placeholder
// email (`whop_<id>@vibechckd.local`), no password, and a temporary
// `role: "client"`. This endpoint lets the user pick their real role
// (client vs creator), set an email + password, and — if they picked creator —
// kick off the coder vetting workflow by ensuring a draft coderProfiles row.
const welcomeSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(200),
    role: z.enum(["client", "coder"]),
  })
  .strict();

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
      // Whop SSO already proved the user controls the Whop account — once they
      // pick an external email/password we count that as verified too. They
      // came in through SSO, never via an unverified registration form.
      emailVerified: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // Creator path → trigger the existing vetting workflow by seeding a draft
  // coderProfiles row. The /apply form (where we redirect from the welcome UI)
  // fills in the rest. Idempotent — does nothing if a row already exists.
  if (role === "coder") {
    await ensureCoderProfile(session.user.id);
  }

  return NextResponse.json({ success: true });
}
