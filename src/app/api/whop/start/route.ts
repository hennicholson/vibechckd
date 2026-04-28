import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, clientProfiles } from "@/db/schema";
import { ensureCoderProfile } from "@/lib/whop-auth";
import { parseBody, z } from "@/lib/validation";

// First-visit picker submit handler. Called from <WhopStartCard /> when a
// freshly-SSO'd Whop user picks Client / Creator / Browse.
//
// Path semantics, with the existing `users.emailVerified` column reused as
// the "fully onboarded" flag for Whop SSO users:
//   - Client / Creator → seed an empty profile row, leave emailVerified null,
//     redirect to /whop/onboarding so they finish role-specific setup.
//   - Browse → no profile row, stamp emailVerified now (skip onboarding).
//     They can still pick a role later from /dashboard.
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

  if (choice === "browse") {
    // Browse → just confirm we showed them the picker; no profile row.
    await db
      .update(users)
      .set({ role: "client", emailVerified: new Date() })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ success: true, next: "/whop" });
  }

  if (choice === "client") {
    await db.update(users).set({ role: "client" }).where(eq(users.id, session.user.id));
    // Seed an empty clientProfile so /whop knows they've picked client and
    // routes them to the client onboarding form (vs. the start picker).
    // Idempotent — `userId` is unique on the table.
    const [existing] = await db
      .select({ id: clientProfiles.id })
      .from(clientProfiles)
      .where(eq(clientProfiles.userId, session.user.id))
      .limit(1);
    if (!existing) {
      await db.insert(clientProfiles).values({ userId: session.user.id });
    }
    return NextResponse.json({ success: true, next: "/whop/onboarding" });
  }

  // choice === "creator"
  await db.update(users).set({ role: "coder" }).where(eq(users.id, session.user.id));
  await ensureCoderProfile(session.user.id);
  return NextResponse.json({ success: true, next: "/whop/onboarding" });
}
