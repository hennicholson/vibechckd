"use client";

/**
 * BrowseLoadingLottie — center-stage loader for the /browse grid.
 *
 * Plays public/lottie/check-intro.json. Uses dynamic import on `lottie-react`
 * so the player ships only when the page actually shows a loading state
 * (avoids adding ~50KB to initial bundle for a transient animation).
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface BrowseLoadingLottieProps {
  // Tunable so other surfaces can reuse the component.
  size?: number;
}

export default function BrowseLoadingLottie({ size = 140 }: BrowseLoadingLottieProps) {
  const [data, setData] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/lottie/check-intro.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Swallow — the surrounding skeleton + label still convey loading.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center py-24"
      role="status"
      aria-label="Loading creators"
    >
      <div style={{ width: size, height: size }}>
        {data ? (
          <Lottie animationData={data} loop autoplay />
        ) : (
          // Fallback while the JSON arrives — same footprint so layout
          // doesn't shift when the animation paints.
          <div className="w-full h-full rounded-full bg-surface-muted animate-pulse" />
        )}
      </div>
      <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
        Loading creators
      </p>
    </div>
  );
}
