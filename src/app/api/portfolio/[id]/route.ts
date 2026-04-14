import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Find the user's coder profile
  const [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify the portfolio item belongs to this user's profile
  const [existing] = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.id, id),
        eq(portfolioItems.coderProfileId, profile.id)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Update the portfolio item
  const [updated] = await db
    .update(portfolioItems)
    .set({
      title: body.title,
      description: body.description ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
    })
    .where(eq(portfolioItems.id, id))
    .returning();

  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the user's coder profile
  const [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Verify the portfolio item belongs to this user's profile
  const [existing] = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.id, id),
        eq(portfolioItems.coderProfileId, profile.id)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Delete (cascade will remove assets)
  await db.delete(portfolioItems).where(eq(portfolioItems.id, id));

  return NextResponse.json({ success: true, id });
}
