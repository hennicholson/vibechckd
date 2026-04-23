import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, coderProfiles, portfolioItems, portfolioAssets } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
// No mock data — only real DB coders

// TODO(perf): This endpoint runs an N+1 query against portfolio_items and
// portfolio_assets for each coder returned. Replace with a single LEFT JOIN
// on portfolio_items + portfolio_assets and assemble in memory once the
// list stabilizes. For now, pagination below caps the blast radius.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
    const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);

    // Query all active/verified coder profiles from Neon
    const allProfiles = await db
      .select()
      .from(coderProfiles)
      .innerJoin(users, eq(coderProfiles.userId, users.id))
      .where(isNotNull(coderProfiles.creatorSlug))
      .limit(limit)
      .offset(offset);

    // Filter out coders with empty profiles (no name or no slug)
    const profiles = allProfiles.filter((row) => {
      const user = row.users;
      const profile = row.coder_profiles;
      return user.name && user.name.trim() !== "" && profile.creatorSlug && profile.creatorSlug.trim() !== "";
    });

    if (profiles.length === 0) {
      return NextResponse.json([]);
    }

    // For each profile, get their portfolio items + assets
    const codersWithPortfolio = await Promise.all(
      profiles.map(async (row) => {
        const profile = row.coder_profiles;
        const user = row.users;

        const items = await db
          .select()
          .from(portfolioItems)
          .where(eq(portfolioItems.coderProfileId, profile.id))
          .orderBy(portfolioItems.sortOrder);

        const portfolioWithAssets = await Promise.all(
          items.map(async (item) => {
            const assets = await db
              .select()
              .from(portfolioAssets)
              .where(eq(portfolioAssets.portfolioItemId, item.id))
              .orderBy(portfolioAssets.displayOrder);

            return {
              id: item.id,
              title: item.title,
              description: item.description || "",
              thumbnailUrl: item.thumbnailUrl || "",
              assets: assets.map((a) => ({
                id: a.id,
                type: a.assetType,
                title: a.title,
                url: a.fileUrl || "",
                thumbnailUrl: a.thumbnailUrl || undefined,
              })),
            };
          })
        );

        return {
          id: profile.id,
          slug: profile.creatorSlug || "",
          displayName: user.name || "",
          avatarUrl: profile.pfpUrl || `/pfp/${(profile.creatorSlug || "").split("-")[0]}.jpeg`,
          gifPreviewUrl: profile.gifPreviewUrl || "",
          bio: profile.bio || "",
          tagline: profile.tagline || "",
          location: profile.location || "",
          websiteUrl: profile.websiteUrl || undefined,
          githubUrl: profile.githubUrl || undefined,
          twitterUrl: profile.twitterUrl || undefined,
          linkedinUrl: profile.linkedinUrl || undefined,
          title: (profile.specialties?.[0] || "Developer"),
          specialties: (profile.specialties || []) as unknown[],
          yearsExperience: 0,
          availability: profile.availability || "available",
          hourlyRate: profile.hourlyRate || "",
          skills: profile.tags || [],
          tools: [],
          verified: !!profile.verifiedAt,
          featured: false,
          joinedAt: profile.createdAt?.toISOString() || "",
          portfolio: portfolioWithAssets,
        };
      })
    );

    return NextResponse.json(codersWithPortfolio);
  } catch (error) {
    console.error("Error fetching coders:", error);
    return NextResponse.json(
      { error: "Failed to fetch coders" },
      { status: 500 }
    );
  }
}
