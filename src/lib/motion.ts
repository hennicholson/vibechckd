// Shared motion primitives used across dashboard surfaces.
// Keeps the cross-page feel consistent — same easing, same stagger
// rhythm everywhere — without each page redeclaring its own variants.

import type { Variants } from "framer-motion";

// Quart-out, the same curve used in app/template.tsx. Pulled out as
// a typed tuple so framer-motion's strict type checking is happy.
export const EASE_OUT_QUART: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

// Per-item lift-in. Pair with `containerVariants` on the parent to
// stagger. Tuned subtle (6px) so it reads as "the items settled in"
// rather than animating.
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_OUT_QUART },
  },
};

// A slightly stronger variant for top-level section blocks (page
// header, hero cards). 10px lift so they read as the "first layer"
// versus item-level 6px ones underneath.
export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: EASE_OUT_QUART },
  },
};

// Parent container that drives stagger. Children opt in by setting
// variants={itemVariants} or sectionVariants.
export const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

// Tighter container for dense lists (table-like inbox / settings).
export const denseContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};
