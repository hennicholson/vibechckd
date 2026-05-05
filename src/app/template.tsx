"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE_OUT_QUART: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Next.js App Router templates remount on every navigation, so this
// wrapper fires a fresh entrance animation every time the user moves
// between pages. The aim is "this dashboard is one continuous app",
// not "page A unloaded and page B finally arrived."
//
// Curve choices:
//   - 280ms duration with [0.16, 1, 0.3, 1] (a slight ease-out spline
//     borrowed from native iOS transitions). Long enough to read as
//     intentional motion, short enough to never feel slow.
//   - 8px lift + opacity ramp. Subtle layering — the page feels like
//     it's settling into place rather than appearing flat.
//   - The new page is briefly above the previous one's exit position
//     (no hard cut), so visually it reads as a stack of layers being
//     swapped, not a snap.
//
// Accessibility:
//   - Honors `prefers-reduced-motion`. Falls back to a pure opacity
//     fade with no translation when the user has reduced-motion on.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <motion.div
        key="page-template"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="h-full"
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      key="page-template"
      initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.28,
        ease: EASE_OUT_QUART,
        // Tiny stagger so descendant motion.div elements (cards,
        // sections) can layer in slightly after the page wrapper
        // settles. Children opt in by setting a `variants` prop.
        when: "beforeChildren",
        staggerChildren: 0.04,
      }}
      className="h-full will-change-transform"
    >
      {children}
    </motion.div>
  );
}
