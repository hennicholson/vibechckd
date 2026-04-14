import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, coderProfiles, portfolioItems, portfolioAssets } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { coders as mockCoders } from "@/lib/mock-data";

export async function GET() {
  try {
    // Query all active/verified coder profiles from Neon
    const profiles = await db
      .select()
      .from(coderProfiles)
      .innerJoin(users, eq(coderProfiles.userId, users.id))
      .where(isNotNull(coderProfiles.creatorSlug));

    if (profiles.length === 0) {
      return NextResponse.json(mockCoders);
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
          gifPreviewUrl: "",
          bio: profile.bio || "",
          tagline: profile.tagline || "",
          location: profile.location || "",
          websiteUrl: profile.websiteUrl || undefined,
          githubUrl: profile.githubUrl || undefined,
          twitterUrl: profile.twitterUrl || undefined,
          linkedinUrl: profile.linkedinUrl || undefined,
          title: (profile.specialties?.[0] || "Developer"),
          specialties: (profile.specialties || []) as any[],
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

    // Merge DB coders with mock coders (mock coders fill the gallery)
    // DB coders take priority if slug matches
    const dbSlugs = new Set(codersWithPortfolio.map((c) => c.slug));
    const mergedCoders = [
      ...codersWithPortfolio,
      ...mockCoders.filter((c) => !dbSlugs.has(c.slug)),
    ];

    return NextResponse.json(mergedCoders);
  } catch (error) {
    console.error("Error fetching coders:", error);
    return NextResponse.json(mockCoders);
  }
}
