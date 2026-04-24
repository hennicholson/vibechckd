import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  getCodersWithPortfolio,
  getCoderBySlugWithPortfolio,
  type CoderWithPortfolio,
} from "@/lib/db-query";

/**
 * Cache tags for targeted revalidation.
 * Call `revalidateTag(CACHE_TAGS.coders)` from admin routes when a coder
 * is approved/rejected so the public list picks up the change.
 */
export const CACHE_TAGS = {
  coders: "coders-list",
  coderBySlug: "coder-by-slug",
} as const;

/**
 * Data-cache wrapper for the public coder list.
 * 60-second revalidation. Tagged for manual invalidation from admin routes.
 */
export const getCachedCodersList = unstable_cache(
  async (limit: number, offset: number): Promise<CoderWithPortfolio[]> => {
    return getCodersWithPortfolio({ limit, offset });
  },
  ["coders-list-v1"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.coders],
  }
);

/**
 * Data-cache wrapper for single coder profiles (by slug).
 * 60-second revalidation. Tagged so both list and detail can be nuked
 * when a profile is edited.
 */
export const getCachedCoderBySlug = unstable_cache(
  async (slug: string): Promise<CoderWithPortfolio | null> => {
    return getCoderBySlugWithPortfolio(slug);
  },
  ["coder-by-slug-v1"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.coders, CACHE_TAGS.coderBySlug],
  }
);

/**
 * Per-request memo for use inside a single server render.
 * `unstable_cache` gives cross-request caching; `cache()` from React gives
 * single-request memoization (e.g. a page + its generateMetadata both
 * calling this will only hit the data cache once).
 */
export const getCoderBySlugRequestScoped = cache(
  async (slug: string): Promise<CoderWithPortfolio | null> => {
    return getCachedCoderBySlug(slug);
  }
);
