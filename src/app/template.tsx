"use client";

import { motion } from "framer-motion";

// Next.js App Router templates remount on every navigation — perfect for
// firing a subtle entrance animation each time the user moves between
// pages. Keeps the cross-surface flow feeling embedded ("one motion of
// transfer") without needing to coordinate AnimatePresence exit/enter
// across separate route segments.
//
// Tuning:
//   - 4px lift + opacity ramp, 200ms ease-out → fast enough that it
//     doesn't get in the way of fast clicks, gentle enough to read as
//     "the new page slid in" rather than a jarring transition
//   - h-full on the wrapper preserves the existing flex layouts
//     (sidebar + main with overflow-y-auto on inner panels)
//   - will-change-transform so the compositor handles the lift on the
//     GPU and we don't paint the whole tree
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      key="page-template"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="h-full will-change-transform"
    >
      {children}
    </motion.div>
  );
}
