"use client";

import { motion } from "framer-motion";

const PLACEHOLDER_COUNT = 8;

export default function BrowseSkeletonGrid() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.45 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-10 md:gap-x-8 md:gap-y-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pointer-events-none select-none"
      aria-hidden
    >
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-surface-muted animate-pulse" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-[12px] w-3/5 rounded bg-surface-muted animate-pulse" />
              <div className="h-[10px] w-2/5 rounded bg-surface-muted animate-pulse" />
            </div>
          </div>
          <div className="relative aspect-[16/10] rounded-[10px] bg-surface-muted animate-pulse" />
        </div>
      ))}
    </motion.div>
  );
}
