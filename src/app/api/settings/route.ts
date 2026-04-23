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
const settingsPutSchema = z
  .object({
    availability: z.enum(["available", "selective", "unavailable"]).optional(),
    password: z.string().min(8).max(200).optional(),
    notifications: z
      .object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict();

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
  const { availability, password } = parsed.data;

  // Update availability on coder_profiles if provided
  if (availability) {
    const [profile] = await db
      .select({ id: coderProfiles.id })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, session.user.id))
      .limit(1);

    if (profile) {
      await db
        .update(coderProfiles)
        .set({ availability, updatedAt: new Date() })
        .where(eq(coderProfiles.id, profile.id));
    }
  }

  // Update password if provided.
  // bcrypt cost=13 per current policy (tradeoff: ~1s per hash on modern CPU)
  if (password) {
    const hash = await bcrypt.hash(password, 13);
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
