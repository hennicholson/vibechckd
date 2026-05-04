"use client";

/**
 * BrowseCoderCard — vetted.cv-style showcase card.
 *
 * Layout (top to bottom):
 *   1. Header row: avatar + name on top, specialty muted beneath.
 *   2. Hero image (16:10), rounded, no border chrome.
 *
 * Deliberate omissions vs the previous design:
 *   - no card border / background fill
 *   - no project-count, hourly-rate, availability dot, location, skill chips,
 *     verified badge, favorite heart, or role-aware CTA on the card surface
 *
 * Those affordances live on the profile detail / overlay so the browse grid
 * stays calm and image-forward.
 */

import Image from "next/image";
import { motion } from "framer-motion";
import { SPECIALTY_LABELS, type Coder } from "@/lib/mock-data";

function isRealUrl(url: string | undefined | null): url is string {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

function isImageAssetReachable(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("http") || url.startsWith("/pfp/");
}

interface BrowseCoderCardProps {
  coder: Coder;
  index: number;
  onClick: () => void;
  // Kept on the type for now so callers compile, but unused at the card
  // level — the role-aware "Start a project" / "Connect" actions moved
  // off the grid surface to keep the browse view calm.
  viewerRole?: "client" | "creator" | "guest";
  onPrimaryAction?: (coder: Coder) => void;
}

export default function BrowseCoderCard({
  coder,
  index,
  onClick,
}: BrowseCoderCardProps) {
  const hasGif = isRealUrl(coder.gifPreviewUrl);
  const hasAvatar = isImageAssetReachable(coder.avatarUrl);
  const heroUrl = hasGif ? coder.gifPreviewUrl : hasAvatar ? coder.avatarUrl : null;

  const specialty = SPECIALTY_LABELS[coder.specialties?.[0]] || "Developer";
  const initial = (coder.displayName || "?").charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.02, 0.2),
        ease: [0.2, 0, 0, 1],
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      className="group block text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-[10px]"
      aria-label={`View profile for ${coder.displayName}`}
    >
      {/* Header — avatar + name, then muted specialty beneath */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-medium text-text-muted flex-shrink-0 overflow-hidden relative">
          {hasAvatar ? (
            <Image
              src={coder.avatarUrl}
              alt=""
              fill
              sizes="28px"
              className="object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-text-primary truncate leading-tight">
            {coder.displayName}
          </p>
          <p className="text-[12px] text-text-muted truncate leading-tight mt-0.5">
            {specialty}
          </p>
        </div>
      </div>

      {/* Hero image — no border, soft rounded corners. Subtle hover lift. */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-surface-muted transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={coder.displayName}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            unoptimized={heroUrl.toLowerCase().endsWith(".gif")}
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #f5f5f5 0%, #ededed 45%, #e5e5e5 100%)",
            }}
          >
            <span className="text-[80px] font-semibold text-text-muted/30 tracking-[-0.05em] select-none">
              {initial}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
