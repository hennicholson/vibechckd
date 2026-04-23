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
    // Enforce that a password change requires currentPassword to avoid session
    // hijack → silent password rotation. This mirrors the UX in the settings UI.
    if (data.password && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: "Current password is required to change password",
      });
    }
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
    .select({ email: users.email })
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
  // Proof-of-possession: verify currentPassword against stored bcrypt hash.
  // bcrypt cost=13 per current policy (tradeoff: ~1s per hash on modern CPU).
  if (password && currentPassword) {
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 13);
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
