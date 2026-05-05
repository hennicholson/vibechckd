"use client";

import { useEffect, useState } from "react";

// Tiny hook that exposes the current user's total unread inbox count.
// Used by the sidebar inbox indicator and the floating quick-chat
// button. Polls every 30s and re-fetches on visibility/focus changes
// so the dot reacts to incoming messages without per-message SSE
// plumbing in every consumer.
export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let interval: number | null = null;

    async function fetchCount() {
      try {
        const res = await fetch("/api/conversations/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(typeof data.count === "number" ? data.count : 0);
      } catch {
        // network blip — keep last value, will retry next tick
      }
    }

    fetchCount();
    interval = window.setInterval(fetchCount, 30_000);

    function onVisible() {
      if (document.visibilityState === "visible") fetchCount();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", fetchCount);

    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", fetchCount);
    };
  }, []);

  return count;
}
