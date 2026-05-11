"use client";

/**
 * BrowseIntroOverlay — vetted-mark intro that plays in the grid window
 * (not over the whole viewport). Sidebar + sticky header stay live the
 * whole time, so the entrance feels like content materializing inside
 * the shell instead of a takeover screen.
 *
 * Sequence: Lottie plays once → "VIBECHCKD" wordmark types in beneath
 * it → onDone() fires so the parent can crossfade us out into the
 * skeleton/grid.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Lottie = dynamic(
  () => import("lottie-react").then((m) => m.default),
  { ssr: false }
);

interface BrowseIntroOverlayProps {
  onDone: () => void;
}

const HARD_TIMEOUT_MS = 3500;
const WORDMARK = "VIBECHCKD";

// Wordmark starts mid-Lottie so the brand resolves alongside the mark
// instead of after it — feels like one continuous motion, not two beats.
const WORDMARK_DELAY_MS = 550;
// After the Lottie ends, hold the composed lockup briefly before
// crossfading into the skeleton/grid.
const POST_LOTTIE_HOLD_MS = 620;

export default function BrowseIntroOverlay({ onDone }: BrowseIntroOverlayProps) {
  const [data, setData] = useState<unknown | null>(null);
  const [showWordmark, setShowWordmark] = useState(false);
  const [lottieDone, setLottieDone] = useState(false);
  const firedRef = useRef(false);

  function finish() {
    if (firedRef.current) return;
    firedRef.current = true;
    onDone();
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/lottie/check-intro.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});

    const wordmarkTimer = window.setTimeout(
      () => setShowWordmark(true),
      WORDMARK_DELAY_MS
    );
    const safety = window.setTimeout(finish, HARD_TIMEOUT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(wordmarkTimer);
      window.clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lottieDone) return;
    const t = window.setTimeout(finish, POST_LOTTIE_HOLD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lottieDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      // min-height fills the visible viewport below the sticky header +
      // tab row so the Lottie + wordmark land in the user's eye-line
      // instead of crammed at the top of the grid slot.
      className="flex flex-col items-center justify-center min-h-[calc(100dvh-220px)] -mt-2"
      role="status"
      aria-label="Loading vetted creators"
    >
      <div className="w-[180px] h-[180px] md:w-[200px] md:h-[200px]">
        {data ? (
          <Lottie
            animationData={data}
            loop={false}
            autoplay
            onComplete={() => setLottieDone(true)}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-surface-muted animate-pulse" />
        )}
      </div>

      {/* Wordmark — letters stagger-fade in part-way through the Lottie
          so the brand resolves alongside the mark, not after it. */}
      <div className="-mt-1 h-[18px] flex items-center justify-center overflow-hidden">
        {showWordmark && (
          <motion.div
            className="flex items-center text-[13px] font-semibold tracking-[0.28em] text-text-primary"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.055 } },
            }}
            aria-label={WORDMARK}
          >
            {WORDMARK.split("").map((char, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 5 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
