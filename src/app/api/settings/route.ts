import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { parseBody, z } from "@/lib/validation";

// PUT body — whitelist of what a user can change via settings.
// NEVER includes role, email, id, or any other privileged field. Even if
// a client sends those, zod's `.strict()` rejects the entire request.
// When `password` is present we also require `currentPassword` for proof of
// possession — the base schema captures both; .superRefine enforces pairing.
const settingsPutSchema = z
  .object({
    availability: z.enum(["available", "selective", "unavailable"]).optional(),
    // Profile gallery visibility toggle. `active` = shown, `draft` = hidden.
    // Only these two transitions are user-controllable; `pending`/`suspended`
    // are administrative states managed elsewhere.
    profileVisibility: z.enum(["active", "draft"]).optional(),
    currentPassword: z.string().min(1).max(200).optional(),
    password: z.string().min(8).max(200).optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Whether `currentPassword` is required depends on the user's DB state
    // (Whop-SSO users have no passwordHash and are setting one for the first
    // time). The presence/absence check therefore happens imperatively in the
    // PUT handler. We still enforce that new != current when both are given.
    if (data.password && data.currentPassword && data.password === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "New password must differ from current password",
      });
    }
  });

/**
 * GET /api/settings — returns the settings values that belong to the current
 * user. Kept minimal: avoids duplicating the full profile payload from
 * /api/profile, only ships fields the settings page actually renders.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
      whopUserId: users.whopUserId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [profile] = await db
    .select({
      availability: coderProfiles.availability,
      status: coderProfiles.status,
    })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    email: user?.email ?? null,
    availability: profile?.availability ?? null,
    profileStatus: profile?.status ?? null,
    hasPassword: !!user?.passwordHash,
    whopLinked: !!user?.whopUserId,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(settingsPutSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { availability, password, currentPassword, profileVisibility } = parsed.data;

  // Update availability and/or profile visibility on coder_profiles.
  // Both fields live on the same row, so we batch them into one update.
  if (availability || profileVisibility) {
    const [profile] = await db
      .select({ id: coderProfiles.id, status: coderProfiles.status })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, session.user.id))
      .limit(1);

    if (profile) {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (availability) patch.availability = availability;
      if (profileVisibility) {
        // Guard: don't downgrade/escalate out of administrative states.
        // A suspended or pending profile can't be toggled to active/draft by
        // its owner — silently ignore the field in those cases.
        if (profile.status === "active" || profile.status === "draft") {
          patch.status = profileVisibility;
        }
      }
      await db.update(coderProfiles).set(patch).where(eq(coderProfiles.id, profile.id));
    }
  }

  // Update password if provided.
  // Two paths:
  //  - User already has a password → require `currentPassword` (rotation).
  //  - User has none (Whop-SSO-only account) → set initial password without
  //    proof-of-possession; the live next-auth session is itself the proof.
  if (password) {
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const hasPassword = !!user?.passwordHash;

    if (hasPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 }
        );
      }
      const valid = await bcrypt.compare(currentPassword, user!.passwordHash!);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }
    // bcrypt cost=13 per policy (~1s/hash on modern CPU).
    const hash = await bcrypt.hash(password, 13);
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
