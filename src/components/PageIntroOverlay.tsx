"use client";

/**
 * PageIntroOverlay — branded intro animation that fills the main
 * column of a page while initial data loads. Plays a thematic Lottie
 * (one per tab) then stagger-fades in a wordmark, hands off via
 * onDone so the parent can crossfade into a skeleton/grid.
 *
 * Visual language matches public/lottie/check-intro.json (the vetted
 * mark used on /browse): monochrome, layered shapes, overshoot easing.
 *
 * Re-pacing notes are inline on the timing constants.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const Lottie = dynamic(
  () => import("lottie-react").then((m) => m.default),
  { ssr: false }
);

interface PageIntroOverlayProps {
  // Public path to a Lottie JSON (must live under /public).
  lottiePath: string;
  // All-caps wordmark that stagger-fades in beneath the mark.
  wordmark: string;
  // Aria label / fallback text for the role=status container.
  ariaLabel?: string;
  // Called when the intro is finished (either Lottie complete + hold,
  // or the safety timeout fired).
  onDone: () => void;
}

const HARD_TIMEOUT_MS = 3500;
const WORDMARK_DELAY_MS = 550;
const POST_LOTTIE_HOLD_MS = 620;

export default function PageIntroOverlay({
  lottiePath,
  wordmark,
  ariaLabel,
  onDone,
}: PageIntroOverlayProps) {
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
    fetch(lottiePath)
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
  }, [lottiePath]);

  useEffect(() => {
    if (!lottieDone) return;
    const t = window.setTimeout(finish, POST_LOTTIE_HOLD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lottieDone]);

  return (
    // Renders as a full-bleed overlay over its nearest positioned
    // ancestor (parent must be `relative`). Sits above the page shell
    // so the skeleton + sticky header are already laid out underneath
    // when this fades out — no cold layout pop on completion.
    //
    // Solid bg-background mask hides the skeleton until it's the
    // moment to reveal it (when the lottie + wordmark finish and this
    // overlay crossfades away).
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-30 bg-background flex flex-col items-center justify-center pointer-events-auto"
      role="status"
      aria-label={ariaLabel || `Loading ${wordmark.toLowerCase()}`}
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
            aria-label={wordmark}
          >
            {wordmark.split("").map((char, i) => (
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
