import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioItems, portfolioAssets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Helper to verify item ownership
async function verifyOwnership(userId: string, portfolioItemId: string) {
  const [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, userId))
    .limit(1);

  if (!profile) return null;

  const [item] = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.id, portfolioItemId),
        eq(portfolioItems.coderProfileId, profile.id)
      )
    )
    .limit(1);

  return item ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const item = await verifyOwnership(session.user.id, id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const [asset] = await db
    .insert(portfolioAssets)
    .values({
      portfolioItemId: id,
      assetType: body.assetType,
      title: body.title,
      fileUrl: body.fileUrl ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      displayOrder: body.displayOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ success: true, asset });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { assetId } = body;

  if (!assetId) {
    return NextResponse.json({ error: "assetId required" }, { status: 400 });
  }

  const item = await verifyOwnership(session.user.id, id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Verify asset belongs to this portfolio item
  const [asset] = await db
    .select({ id: portfolioAssets.id })
    .from(portfolioAssets)
    .where(
      and(
        eq(portfolioAssets.id, assetId),
        eq(portfolioAssets.portfolioItemId, id)
      )
    )
    .limit(1);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await db.delete(portfolioAssets).where(eq(portfolioAssets.id, assetId));

  return NextResponse.json({ success: true, assetId });
}
