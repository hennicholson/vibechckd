import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureCoderProfile } from "@/lib/whop-auth";
import { parseBody, z } from "@/lib/validation";

// First-visit picker submit handler. Called from <WhopStartCard /> when a
// freshly-SSO'd Whop user picks Client / Creator / Browse on the welcome
// card at /whop. Marks them as "ready to use the app" by stamping
// `emailVerified` (we treat that timestamp as the chose-a-path flag for
// Whop SSO users — see `findOrCreateWhopUser`).
const startSchema = z
  .object({ choice: z.enum(["client", "creator", "browse"]) })
  .strict();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(startSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { choice } = parsed.data;

  // Map the picker choice to a (role, redirect target). Browse keeps the
  // default `client` role — they didn't commit, but role has to be a valid
  // value, and clients see the marketplace by default.
  const role = choice === "creator" ? "coder" : "client";
  const next =
    choice === "creator" ? "/apply" : "/whop";

  await db
    .update(users)
    .set({
      role,
      emailVerified: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // Creators also get a draft coderProfiles row so /apply can fill it in
  // (matches the email-signup creator flow). Idempotent.
  if (choice === "creator") {
    await ensureCoderProfile(session.user.id);
  }

  return NextResponse.json({ success: true, next });
}
