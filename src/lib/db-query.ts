import { db } from "@/db";
import {
  users,
  coderProfiles,
  portfolioItems,
  portfolioAssets,
} from "@/db/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";

/**
 * Shape returned by the reusable coder-list query.
 * Matches the previous /api/coders JSON payload exactly so the browse page
 * and /coders/[slug] continue to work unchanged.
 */
export type CoderWithPortfolio = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl: string;
  gifPreviewUrl: string;
  bio: string;
  tagline: string;
  location: string;
  websiteUrl: string | undefined;
  githubUrl: string | undefined;
  twitterUrl: string | undefined;
  linkedinUrl: string | undefined;
  title: string;
  specialties: unknown[];
  yearsExperience: number;
  availability: string;
  hourlyRate: string;
  skills: string[];
  tools: string[];
  verified: boolean;
  featured: boolean;
  joinedAt: string;
  portfolio: Array<{
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    assets: Array<{
      id: string;
      type: string;
      title: string;
      url: string;
      thumbnailUrl: string | undefined;
    }>;
  }>;
};

type ListOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Fetch coders with their portfolio items + assets in a fixed number of
 * queries (3), regardless of list length.
 *
 * Previously this endpoint ran an N+1:
 *   1  SELECT coders
 *   N  SELECT portfolio_items WHERE coder_profile_id = ? (one per coder)
 *   N*M SELECT portfolio_assets WHERE portfolio_item_id = ? (one per item)
 *
 * New pattern:
 *   Q1  coders + users (joined)
 *   Q2  portfolio_items WHERE coder_profile_id IN (...)
 *   Q3  portfolio_assets WHERE portfolio_item_id IN (...)
 * Then everything is regrouped in memory via Map lookups.
 */
export async function getCodersWithPortfolio(
  opts: ListOptions = {}
): Promise<CoderWithPortfolio[]> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const offset = Math.max(0, opts.offset ?? 0);

  // Query 1: coders joined with users, paginated.
  const rows = await db
    .select()
    .from(coderProfiles)
    .innerJoin(users, eq(coderProfiles.userId, users.id))
    .where(isNotNull(coderProfiles.creatorSlug))
    .limit(limit)
    .offset(offset);

  // Drop profiles that are missing a name or slug — matches prior behavior.
  const profiles = rows.filter((row) => {
    const user = row.users;
    const profile = row.coder_profiles;
    return (
      !!user.name &&
      user.name.trim() !== "" &&
      !!profile.creatorSlug &&
      profile.creatorSlug.trim() !== ""
    );
  });

  if (profiles.length === 0) return [];

  const profileIds = profiles.map((r) => r.coder_profiles.id);

  // Query 2: all portfolio items for these profiles in one shot.
  const items = await db
    .select()
    .from(portfolioItems)
    .where(inArray(portfolioItems.coderProfileId, profileIds))
    .orderBy(portfolioItems.sortOrder);

  const itemIds = items.map((i) => i.id);

  // Query 3: all assets for those items in one shot. Skip if no items.
  const assets =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(portfolioAssets)
          .where(inArray(portfolioAssets.portfolioItemId, itemIds))
          .orderBy(portfolioAssets.displayOrder);

  // Regroup in memory.
  const itemsByProfile = new Map<string, typeof items>();
  for (const item of items) {
    const bucket = itemsByProfile.get(item.coderProfileId);
    if (bucket) bucket.push(item);
    else itemsByProfile.set(item.coderProfileId, [item]);
  }

  const assetsByItem = new Map<string, typeof assets>();
  for (const asset of assets) {
    const bucket = assetsByItem.get(asset.portfolioItemId);
    if (bucket) bucket.push(asset);
    else assetsByItem.set(asset.portfolioItemId, [asset]);
  }

  // Assemble response in the exact legacy shape.
  return profiles.map((row) => {
    const profile = row.coder_profiles;
    const user = row.users;
    const profileItems = itemsByProfile.get(profile.id) ?? [];

    const portfolio = profileItems.map((item) => {
      const itemAssets = assetsByItem.get(item.id) ?? [];
      return {
        id: item.id,
        title: item.title,
        description: item.description || "",
        thumbnailUrl: item.thumbnailUrl || "",
        assets: itemAssets.map((a) => ({
          id: a.id,
          type: a.assetType,
          title: a.title,
          url: a.fileUrl || "",
          thumbnailUrl: a.thumbnailUrl || undefined,
        })),
      };
    });

    return {
      id: profile.id,
      slug: profile.creatorSlug || "",
      displayName: user.name || "",
      avatarUrl:
        profile.pfpUrl ||
        `/pfp/${(profile.creatorSlug || "").split("-")[0]}.jpeg`,
      gifPreviewUrl: profile.gifPreviewUrl || "",
      bio: profile.bio || "",
      tagline: profile.tagline || "",
      location: profile.location || "",
      websiteUrl: profile.websiteUrl || undefined,
      githubUrl: profile.githubUrl || undefined,
      twitterUrl: profile.twitterUrl || undefined,
      linkedinUrl: profile.linkedinUrl || undefined,
      title: profile.specialties?.[0] || "Developer",
      specialties: (profile.specialties || []) as unknown[],
      yearsExperience: 0,
      availability: profile.availability || "available",
      hourlyRate: profile.hourlyRate || "",
      skills: profile.tags || [],
      tools: [],
      verified: !!profile.verifiedAt,
      featured: false,
      joinedAt: profile.createdAt?.toISOString() || "",
      portfolio,
    };
  });
}

/**
 * Fetch a single coder by slug with portfolio in at most 3 queries.
 * Shares the same regroup logic as the list fetcher so /coders/[slug]
 * doesn't need to pull the entire list.
 */
export async function getCoderBySlugWithPortfolio(
  slug: string
): Promise<CoderWithPortfolio | null> {
  // Query 1: coder + user.
  const rows = await db
    .select()
    .from(coderProfiles)
    .innerJoin(users, eq(coderProfiles.userId, users.id))
    .where(eq(coderProfiles.creatorSlug, slug))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const profile = row.coder_profiles;
  const user = row.users;

  if (!user.name || !profile.creatorSlug) return null;

  // Query 2: portfolio items for this profile.
  const items = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.coderProfileId, profile.id))
    .orderBy(portfolioItems.sortOrder);

  const itemIds = items.map((i) => i.id);

  // Query 3: assets for those items — single IN query.
  const assets =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(portfolioAssets)
          .where(inArray(portfolioAssets.portfolioItemId, itemIds))
          .orderBy(portfolioAssets.displayOrder);

  const assetsByItem = new Map<string, typeof assets>();
  for (const asset of assets) {
    const bucket = assetsByItem.get(asset.portfolioItemId);
    if (bucket) bucket.push(asset);
    else assetsByItem.set(asset.portfolioItemId, [asset]);
  }

  const portfolio = items.map((item) => {
    const itemAssets = assetsByItem.get(item.id) ?? [];
    return {
      id: item.id,
      title: item.title,
      description: item.description || "",
      thumbnailUrl: item.thumbnailUrl || "",
      assets: itemAssets.map((a) => ({
        id: a.id,
        type: a.assetType,
        title: a.title,
        url: a.fileUrl || "",
        thumbnailUrl: a.thumbnailUrl || undefined,
      })),
    };
  });

  return {
    id: profile.id,
    slug: profile.creatorSlug || "",
    displayName: user.name || "",
    avatarUrl:
      profile.pfpUrl ||
      `/pfp/${(profile.creatorSlug || "").split("-")[0]}.jpeg`,
    gifPreviewUrl: profile.gifPreviewUrl || "",
    bio: profile.bio || "",
    tagline: profile.tagline || "",
    location: profile.location || "",
    websiteUrl: profile.websiteUrl || undefined,
    githubUrl: profile.githubUrl || undefined,
    twitterUrl: profile.twitterUrl || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    title: profile.specialties?.[0] || "Developer",
    specialties: (profile.specialties || []) as unknown[],
    yearsExperience: 0,
    availability: profile.availability || "available",
    hourlyRate: profile.hourlyRate || "",
    skills: profile.tags || [],
    tools: [],
    verified: !!profile.verifiedAt,
    featured: false,
    joinedAt: profile.createdAt?.toISOString() || "",
    portfolio,
  };
}
