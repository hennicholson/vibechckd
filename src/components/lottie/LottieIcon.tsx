"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import type { LottieRefCurrentProps } from "lottie-react";

type PlayMode =
  | "auto"        // play once on mount
  | "loop"        // loop forever
  | "hover"       // play forward on hover, reverse on leave
  | "controlled"  // play forward when `active`, reverse when not
  | "trigger";    // imperative — use `replay` prop changes to restart

export type LottieIconProps = {
  /** slug under /public/lottie/audit/<slug>.json */
  slug: string;
  /** square pixel size */
  size?: number;
  /** how playback is driven */
  playMode?: PlayMode;
  /** for controlled mode: true plays forward, false plays reverse */
  active?: boolean;
  /** for trigger mode: changing this value replays from start */
  replay?: number | string;
  /** playback speed multiplier */
  speed?: number;
  /** className passed to outer wrapper */
  className?: string;
  /** inline style on outer wrapper */
  style?: React.CSSProperties;
  /** override loop default (controlled / trigger / auto = false; loop = true) */
  loop?: boolean;
  /** called when animation completes (fires for non-looping plays) */
  onComplete?: () => void;
};

const DATA_CACHE = new Map<string, Promise<unknown>>();

function loadLottie(slug: string): Promise<unknown> {
  let p = DATA_CACHE.get(slug);
  if (!p) {
    p = fetch(`/lottie/audit/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error(`Lottie ${slug} HTTP ${r.status}`);
      return r.json();
    });
    DATA_CACHE.set(slug, p);
  }
  return p;
}

/**
 * Generic Lottie wrapper. Most named components in `./named` use this under the hood.
 * Lazily fetches the JSON from /public/lottie/audit/<slug>.json.
 */
export function LottieIcon({
  slug,
  size = 32,
  playMode = "auto",
  active,
  replay,
  speed = 1,
  className,
  style,
  loop,
  onComplete,
}: LottieIconProps) {
  const ref = useRef<LottieRefCurrentProps>(null);
  const [data, setData] = useState<unknown>(null);
  const [domLoaded, setDomLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLottie(slug)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* fail silently — caller sees an empty box */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // React to active / hovered state for controlled / hover modes.
  // Depend on `domLoaded` so the effect re-runs after the Lottie instance
  // is actually mounted (otherwise ref.current is null on first render).
  useEffect(() => {
    const inst = ref.current;
    if (!inst || !domLoaded) return;
    inst.setSpeed(speed);

    if (playMode === "controlled") {
      inst.setDirection(active ? 1 : -1);
      inst.play();
    } else if (playMode === "hover") {
      inst.setDirection(hovered ? 1 : -1);
      inst.play();
    }
  }, [active, hovered, playMode, speed, domLoaded]);

  // Replay trigger — restart from frame 0 whenever `replay` changes.
  useEffect(() => {
    if (playMode !== "trigger" || !ref.current || !domLoaded) return;
    ref.current.goToAndPlay(0, true);
  }, [replay, playMode, domLoaded]);

  const shouldLoop = loop ?? playMode === "loop";
  // Autoplay covers: auto, loop, controlled+active (play forward on mount),
  // and trigger (play once on mount; replay handler restarts on prop change).
  const shouldAutoplay =
    playMode === "auto" ||
    playMode === "loop" ||
    playMode === "trigger" ||
    (playMode === "controlled" && !!active);

  return (
    <div
      className={className}
      onMouseEnter={() => playMode === "hover" && setHovered(true)}
      onMouseLeave={() => playMode === "hover" && setHovered(false)}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
        ...style,
      }}
    >
      {data ? (
        <Lottie
          animationData={data}
          loop={shouldLoop}
          autoplay={shouldAutoplay}
          lottieRef={ref}
          onComplete={onComplete}
          onDOMLoaded={() => setDomLoaded(true)}
          style={{ width: "100%", height: "100%" }}
        />
      ) : null}
    </div>
  );
}
