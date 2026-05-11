"use client";

import { signOut } from "next-auth/react";

/**
 * fetchJson — fetch + JSON wrapper that signs the user out on a 401 so
 * an expired session doesn't leave a blank dashboard with no signal.
 *
 * Most pages today swallow 401s silently (empty arrays, undefined data).
 * Use this for client-side data fetches that REQUIRE auth — the dashboard
 * surfaces. It's intentionally NOT for unauthenticated paths (apply,
 * register, etc.) where a 401 would be a server bug, not a session issue.
 *
 * Behavior:
 *   - 200-ish: returns the parsed JSON (or undefined if body empty)
 *   - 401: triggers signOut → /login (and rejects the promise)
 *   - everything else: throws { status, body }
 *
 * Callers can still try/catch around it like any fetch.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    // Fire-and-forget signOut so the redirect happens even if the caller
    // doesn't await this promise. Reject so any `await fetchJson(...)`
    // call doesn't keep rendering against stale state.
    signOut({ callbackUrl: "/login" }).catch(() => {});
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error || `Request failed (${res.status})`);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = body;
    throw err;
  }

  // No body (204) → return undefined as T
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
