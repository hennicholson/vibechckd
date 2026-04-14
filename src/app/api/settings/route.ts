import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { availability, password, notifications } = body;

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

  // Update password if provided
  if (password && typeof password === "string" && password.length >= 8) {
    const hash = await bcrypt.hash(password, 12);
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
