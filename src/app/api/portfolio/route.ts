import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, portfolioItems, portfolioAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";

const assetTypeEnumZ = z.enum(["pdf", "image", "video", "live_preview", "figma"]);

const assetSchema = z
  .object({
    assetType: assetTypeEnumZ,
    title: z.string().min(1).max(200),
    fileUrl: z.string().url().max(2048).nullable().optional(),
    thumbnailUrl: z.string().url().max(2048).nullable().optional(),
    displayOrder: z.number().int().nonnegative().max(10_000).optional(),
  })
  .strict();

const portfolioPostSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).nullable().optional(),
    thumbnailUrl: z.string().url().max(2048).nullable().optional(),
    sortOrder: z.number().int().nonnegative().max(10_000).optional(),
    assets: z.array(assetSchema).max(50).optional(),
  })
  .strict();

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

  const rawBody = await req.json().catch(() => null);
  const parsed = parseBody(portfolioPostSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const body = parsed.data;

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
