"use client";

import { motion } from "framer-motion";
import Badge from "./Badge";
import type { Coder } from "@/lib/mock-data";
import { SPECIALTY_LABELS } from "@/lib/mock-data";

interface CoderCardProps {
  coder: Coder;
  index?: number;
  onClick?: () => void;
  compact?: boolean;
}

export default function CoderCard({ coder, index = 0, onClick, compact = false }: CoderCardProps) {
  const hasPfp = coder.avatarUrl.startsWith("/pfp/");
  const city = (coder.location || "").split(",")[0].trim() || "Remote";

  if (compact) {
    return (
      <motion.button
        onClick={onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className="flex-shrink-0 w-[120px] text-left hover:bg-background-alt transition-colors duration-150 cursor-pointer group"
      >
        <div className="aspect-square bg-surface-muted flex items-center justify-center overflow-hidden">
          {hasPfp ? (
            <img
              src={coder.avatarUrl}
              alt={coder.displayName}
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
            />
          ) : (
            <span className="text-[20px] font-medium text-border-hover select-none">
              {coder.displayName.split(" ").map(n => n[0]).join("")}
            </span>
          )}
        </div>
        <div className="px-2 py-1.5">
          <span className="text-[11px] font-medium text-text-primary truncate block">{coder.displayName}</span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="w-full text-left border-b border-r border-border hover:bg-background-alt transition-colors duration-150 cursor-pointer group"
    >
      {/* Thumbnail Area */}
      <div className={`relative aspect-[3/2] bg-surface-muted flex items-center justify-center overflow-hidden transition-all duration-300 ${hasPfp ? "pfp-static" : ""}`}>
        {hasPfp ? (
          <img
            src={coder.avatarUrl}
            alt={coder.displayName}
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <span className="text-[28px] font-medium text-border-hover select-none">
            {coder.displayName.split(" ").map(n => n[0]).join("")}
          </span>
        )}
        {/* Hover tagline overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-3 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <p className="text-[12px] text-white/90 leading-[1.4] translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            {coder.tagline}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-text-primary truncate">{coder.displayName}</span>
          {coder.verified && <Badge variant="verified" />}
          {/* Arrow icon */}
          <svg
            className="w-3 h-3 ml-auto text-text-muted opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <p className="text-[12px] text-text-muted mt-0.5">
          {SPECIALTY_LABELS[coder.specialties?.[0]] || "Developer"} / {city}
        </p>
      </div>
    </motion.button>
  );
}
