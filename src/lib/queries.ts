import { db } from "@/db";
import {
  users,
  coderProfiles,
  portfolioItems,
  portfolioAssets,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCoderProfileByUserId(userId: string) {
  const rows = await db
    .select()
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCoderProjects(userId: string) {
  const profile = await getCoderProfileByUserId(userId);
  if (!profile) return [];
  const items = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.coderProfileId, profile.id))
    .orderBy(portfolioItems.sortOrder);
  return items;
}

export async function getCoderPortfolio(profileId: string) {
  const items = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.coderProfileId, profileId))
    .orderBy(portfolioItems.sortOrder);

  const result = await Promise.all(
    items.map(async (item) => {
      const assets = await db
        .select()
        .from(portfolioAssets)
        .where(eq(portfolioAssets.portfolioItemId, item.id))
        .orderBy(portfolioAssets.displayOrder);
      return {
        id: item.id,
        title: item.title,
        description: item.description ?? "",
        thumbnailUrl: item.thumbnailUrl ?? "",
        assets: assets.map((a) => ({
          id: a.id,
          type: a.assetType,
          title: a.title,
          url: a.fileUrl ?? "",
          thumbnailUrl: a.thumbnailUrl ?? undefined,
        })),
      };
    })
  );
  return result;
}

export async function getAllVerifiedCoders() {
  const rows = await db
    .select({
      user: users,
      profile: coderProfiles,
    })
    .from(coderProfiles)
    .innerJoin(users, eq(coderProfiles.userId, users.id))
    .where(eq(coderProfiles.status, "active"));

  const result = await Promise.all(
    rows.map(async ({ user, profile }) => {
      const portfolio = await getCoderPortfolio(profile.id);
      return mapToCoder(user, profile, portfolio);
    })
  );
  return result;
}

export async function getCoderBySlug(slug: string) {
  const rows = await db
    .select({
      user: users,
      profile: coderProfiles,
    })
    .from(coderProfiles)
    .innerJoin(users, eq(coderProfiles.userId, users.id))
    .where(eq(coderProfiles.creatorSlug, slug))
    .limit(1);

  if (rows.length === 0) return null;

  const { user, profile } = rows[0];
  const portfolio = await getCoderPortfolio(profile.id);
  return mapToCoder(user, profile, portfolio);
}

function mapToCoder(
  user: typeof users.$inferSelect,
  profile: typeof coderProfiles.$inferSelect,
  portfolio: Awaited<ReturnType<typeof getCoderPortfolio>>
) {
  return {
    id: user.id,
    slug: profile.creatorSlug ?? "",
    displayName: user.name ?? "",
    avatarUrl: profile.pfpUrl ?? "",
    gifPreviewUrl: (profile.tags ?? []).find((t) => t.startsWith("gif_preview:"))?.replace("gif_preview:", "") ?? "",
    bio: profile.bio ?? "",
    tagline: profile.tagline ?? "",
    location: profile.location ?? "",
    websiteUrl: profile.websiteUrl ?? undefined,
    githubUrl: profile.githubUrl ?? undefined,
    twitterUrl: profile.twitterUrl ?? undefined,
    linkedinUrl: profile.linkedinUrl ?? undefined,
    title: profile.tagline ?? "",
    specialties: (profile.specialties ?? []) as string[],
    yearsExperience: 0,
    availability: profile.availability ?? "available",
    hourlyRate: profile.hourlyRate ?? "",
    skills: ((profile.tags ?? []) as string[]).filter((t) => !t.startsWith("gif_preview:")),
    tools: [] as string[],
    verified: profile.verifiedAt !== null,
    featured: false,
    joinedAt: user.createdAt.toISOString().split("T")[0],
    portfolio,
  };
}
