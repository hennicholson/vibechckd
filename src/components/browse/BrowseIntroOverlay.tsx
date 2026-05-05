"use client";

/**
 * BrowseIntroOverlay — full-viewport "vetted" intro that plays every
 * time the user enters /browse.
 *
 * Why this exists: the verified seal is the entire product proposition
 * for vibechckd. Re-asserting it on every visit is a brand decision —
 * the user explicitly wanted creators + clients reminded of what the
 * checkmark means before they see the gallery.
 *
 * Behaviour:
 *   1. Mounts as a fixed full-screen overlay with bg-background.
 *   2. Plays public/lottie/check-intro.json once (loop: false).
 *   3. When the Lottie's onComplete fires, fades the overlay out
 *      (260ms) and calls onDone() so the parent can mark the
 *      intro complete and render the grid.
 *   4. Hard timeout (3.5s) fires onDone() even if Lottie fails to
 *      load or the JSON fetch errors — never traps the user behind
 *      a blank screen.
 *
 * The browse page renders its content underneath the overlay from
 * the very first paint, so data fetches kick off in parallel with
 * the animation. By the time the overlay fades, the grid usually
 * already has data ready to stagger in.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const Lottie = dynamic(
  () => import("lottie-react").then((m) => m.default),
  { ssr: false }
);

interface BrowseIntroOverlayProps {
  // Called once the intro is fully complete (Lottie finished, fade done,
  // OR the safety timeout fired). Parent uses this to render the page.
  onDone: () => void;
}

const HARD_TIMEOUT_MS = 3500;

export default function BrowseIntroOverlay({ onDone }: BrowseIntroOverlayProps) {
  const [data, setData] = useState<unknown | null>(null);
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);

  // Single-shot finish — both the Lottie completion path and the
  // safety timeout call this; whichever wins wins.
  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setVisible(false);
    // Wait for the fade to settle, then notify the parent. Matches
    // the AnimatePresence exit duration below.
    setTimeout(() => onDone(), 280);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/lottie/check-intro.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // If the JSON is unreachable, the timeout below handles us.
      });

    // Safety net: never trap the user. 3.5s is long enough for the
    // 2.5s animation + a fade, short enough that a failed Lottie
    // fetch doesn't strand the page.
    const t = window.setTimeout(finish, HARD_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="browse-intro"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background"
          role="status"
          aria-label="Loading vetted creators"
        >
          <div className="w-[180px] h-[180px] md:w-[220px] md:h-[220px]">
            {data ? (
              <Lottie
                animationData={data}
                loop={false}
                autoplay
                onComplete={finish}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-surface-muted animate-pulse" />
            )}
          </div>
          <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
            Vetted
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
