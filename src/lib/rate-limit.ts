/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: This stores state in a module-scoped Map, which is sufficient for a
 * single-instance dev/MVP deployment. In multi-instance production, each node
 * will track its own counters — replace this with a centralized store like
 * Upstash Redis or a shared cache backend.
 */

// Module-scoped store: key -> array of request timestamps (ms since epoch)
const store = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check whether a request identified by `key` is allowed under a sliding
 * window of `windowMs` milliseconds with a maximum of `limit` hits.
 *
 * Returns:
 *   allowed   — true if the request is within the limit
 *   remaining — hits left in the current window after this one
 *   resetAt   — ms-since-epoch at which the oldest relevant hit ages out
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Load & prune expired entries
  const timestamps = (store.get(key) || []).filter((t) => t > cutoff);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    store.set(key, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  // Opportunistically prune the whole store when it grows unwieldy to
  // prevent unbounded memory growth in long-lived processes.
  if (store.size > 10_000) {
    for (const [k, ts] of store.entries()) {
      const live = ts.filter((t) => t > cutoff);
      if (live.length === 0) store.delete(k);
      else store.set(k, live);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    resetAt: now + windowMs,
  };
}

/**
 * Derive a rate-limit key from a request's forwarded IP plus a scope.
 * Falls back to the literal "unknown" when no IP header is present.
 */
export function rateLimitKey(req: Request, scope: string): string {
  const xff = req.headers.get("x-forwarded-for");
  const xri = req.headers.get("x-real-ip");
  const ip =
    (xff && xff.split(",")[0].trim()) || (xri && xri.trim()) || "unknown";
  return `${scope}:${ip}`;
}
