"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Centralised favorites state for the browse + popup + team-builder
// surfaces. Loads once when the user signs in, then optimistically
// flips on each toggle (rollback on API error).
export function useFavorites() {
  const { status } = useSession();
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setIds(new Set());
      setLoaded(true);
      return;
    }
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids: string[] }) => {
        setIds(new Set(d.ids ?? []));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [status]);

  const toggle = useCallback(
    async (coderProfileId: string) => {
      if (status !== "authenticated") {
        // Bubble a custom event so callers can prompt sign-in if they want.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("favorites:require-auth"));
        }
        return;
      }
      const wasFavorited = ids.has(coderProfileId);
      // Optimistic flip
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(coderProfileId);
        else next.add(coderProfileId);
        return next;
      });
      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coderProfileId }),
        });
        if (!res.ok) throw new Error("toggle failed");
        const data: { favorited: boolean } = await res.json();
        // Reconcile with server truth
        setIds((prev) => {
          const next = new Set(prev);
          if (data.favorited) next.add(coderProfileId);
          else next.delete(coderProfileId);
          return next;
        });
      } catch {
        // Roll back optimistic flip on error
        setIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(coderProfileId);
          else next.delete(coderProfileId);
          return next;
        });
      }
    },
    [ids, status]
  );

  return { ids, isFavorited: (id: string) => ids.has(id), toggle, loaded };
}
