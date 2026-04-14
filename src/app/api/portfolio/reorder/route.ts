import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { order } = body;

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  // Find the user's coder profile
  const [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Batch update sort_order for each item, verifying ownership
  for (const { id, sortOrder } of order) {
    await db
      .update(portfolioItems)
      .set({ sortOrder })
      .where(
        and(
          eq(portfolioItems.id, id),
          eq(portfolioItems.coderProfileId, profile.id)
        )
      );
  }

  return NextResponse.json({ success: true });
}
