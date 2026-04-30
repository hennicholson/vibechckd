"use client";

/**
 * BrowseCoderCard — Compact card for a single coder.
 *
 * Layout (top to bottom):
 *  1. 16:10 image area (gifPreview > avatar > generated placeholder)
 *     - absolute top-right: "N projects" badge when project count > 0
 *  2. Info row: avatar + name (+ verified check), availability dot + rate
 *  3. Sub-row: specialty · location
 *  4. Skill chips: first 3, rounded-md, 11px
 *
 * Card chrome matches dashboard cards:
 *  - rounded-[10px], border-border, p-4, no shadow
 *  - hover: border-border-hover only (clean)
 */

import Image from "next/image";
import { motion } from "framer-motion";
import Badge from "@/components/Badge";
import FavoriteButton from "@/components/FavoriteButton";
import { useFavorites } from "@/lib/use-favorites";
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
}

const availabilityDot: Record<Coder["availability"], string> = {
  available: "bg-positive",
  selective: "bg-warning",
  unavailable: "bg-border-hover",
};

const availabilityLabel: Record<Coder["availability"], string> = {
  available: "Available",
  selective: "Selective",
  unavailable: "Unavailable",
};

export default function BrowseCoderCard({ coder, index, onClick }: BrowseCoderCardProps) {
  const { isFavorited, toggle } = useFavorites();
  const hasGif = isRealUrl(coder.gifPreviewUrl);
  const hasAvatar = isImageAssetReachable(coder.avatarUrl);
  const heroUrl = hasGif ? coder.gifPreviewUrl : hasAvatar ? coder.avatarUrl : null;

  const projectCount = (coder.portfolio || []).length;
  const skills = (coder.skills || []).slice(0, 3);
  const specialty = SPECIALTY_LABELS[coder.specialties?.[0]] || "Developer";
  const location = coder.location || "Remote";
  const initial = (coder.displayName || "?").charAt(0).toUpperCase();

  return (
    // Card root is a div with role="button" (not a real <button>) so the
    // nested FavoriteButton can stay a real <button> without violating the
    // HTML rule that <button> can't be a descendant of <button>. We add
    // explicit keyboard handlers (Enter / Space) to keep accessibility on
    // par with a real button.
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2), ease: [0.2, 0, 0, 1] }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      className="group text-left bg-background border border-border rounded-[10px] overflow-hidden hover:border-border-hover transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View profile for ${coder.displayName}`}
    >
      {/* Hero image area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={coder.displayName}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            // GIFs are passed through unoptimized so they keep animating —
            // the optimizer doesn't re-encode GIFs anyway. Static images
            // (JPEG/PNG/WebP) go through the optimizer for AVIF/WebP +
            // responsive srcSet, which is the actual cold-load win.
            unoptimized={heroUrl.toLowerCase().endsWith(".gif")}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #f5f5f5 0%, #ededed 45%, #e5e5e5 100%)",
            }}
          >
            <span className="text-[64px] font-semibold text-text-muted/40 tracking-[-0.05em] select-none">
              {initial}
            </span>
          </div>
        )}

        {/* Project count badge — only when data is real */}
        {projectCount > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center h-5 px-2 rounded-md bg-text-primary text-[10px] font-mono text-white tabular-nums">
            {projectCount} project{projectCount !== 1 ? "s" : ""}
          </span>
        )}

        {/* Favorite heart — top-left so it doesn't collide with project badge */}
        <div className="absolute top-2 left-2">
          <FavoriteButton
            favorited={isFavorited(coder.id)}
            onClick={() => toggle(coder.id)}
            size="sm"
          />
        </div>
      </div>

      {/* Info section */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted flex-shrink-0 overflow-hidden relative">
            {hasAvatar ? (
              <Image
                src={coder.avatarUrl}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            ) : (
              initial
            )}
          </div>
          {/* Name + verified */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <span className="text-[13px] font-medium text-text-primary truncate">
              {coder.displayName}
            </span>
            {coder.verified && <Badge variant="verified" />}
          </div>
          {/* Availability + rate */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`w-[6px] h-[6px] rounded-full ${availabilityDot[coder.availability]}`}
              aria-label={availabilityLabel[coder.availability]}
              title={availabilityLabel[coder.availability]}
            />
            {coder.hourlyRate && (
              <span className="text-[11px] font-mono text-text-muted tabular-nums">
                {coder.hourlyRate}
              </span>
            )}
          </div>
        </div>

        {/* Specialty · Location */}
        <p className="mt-1.5 text-[11px] font-mono text-text-muted truncate pl-8">
          {specialty} <span className="mx-1 text-text-muted/60">·</span> {location}
        </p>

        {/* Skills row */}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center h-[20px] px-1.5 rounded-md border border-border text-[11px] text-text-secondary bg-background whitespace-nowrap"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
