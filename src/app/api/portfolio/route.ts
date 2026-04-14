import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioItems, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find coder profile for this user
  const [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    return NextResponse.json([]);
  }

  // Get all portfolio items for this profile
  const items = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.coderProfileId, profile.id));

  // Get assets for each item
  const itemsWithAssets = await Promise.all(
    items.map(async (item) => {
      const assets = await db
        .select()
        .from(portfolioAssets)
        .where(eq(portfolioAssets.portfolioItemId, item.id));
      return { ...item, assets };
    })
  );

  return NextResponse.json(itemsWithAssets);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Find or create coder profile
  let [profile] = await db
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    const [newProfile] = await db
      .insert(coderProfiles)
      .values({ userId: session.user.id })
      .returning({ id: coderProfiles.id });
    profile = newProfile;
  }

  // Insert the portfolio item
  const [item] = await db
    .insert(portfolioItems)
    .values({
      coderProfileId: profile.id,
      title: body.title,
      description: body.description ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  // Insert assets if provided
  if (body.assets && Array.isArray(body.assets)) {
    for (const asset of body.assets) {
      await db.insert(portfolioAssets).values({
        portfolioItemId: item.id,
        assetType: asset.assetType,
        title: asset.title,
        fileUrl: asset.fileUrl ?? null,
        thumbnailUrl: asset.thumbnailUrl ?? null,
        displayOrder: asset.displayOrder ?? 0,
      });
    }
  }

  return NextResponse.json({ success: true, item });
}
