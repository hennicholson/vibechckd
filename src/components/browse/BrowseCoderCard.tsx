"use client";

/**
 * BrowseCoderCard — Editorial card for a single coder.
 *
 * Layout (top to bottom):
 *  1. 16:9 image area (gifPreview > avatar > generated placeholder)
 *     - absolute top-right: "N projects" badge when project count > 0
 *  2. Info row: avatar + name (+ verified check), availability dot + rate
 *  3. Sub-row: specialty · location
 *  4. Skill chips: first 3, outlined, small
 *
 * Placeholder strategy: when no meaningful image is available, render a soft
 * monochrome gradient with the coder's large initial centered — matches the
 * reference's restrained silhouette aesthetic without hallucinating photos.
 */

import { motion } from "framer-motion";
import Badge from "@/components/Badge";
import { SPECIALTY_LABELS, type Coder } from "@/lib/mock-data";

function isRealUrl(url: string | undefined | null): url is string {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

function isImageAssetReachable(url: string | undefined | null): boolean {
  // Accept absolute http(s) OR a public path starting with / that does NOT look
  // like a mock placeholder (all /pfp/*.jpeg mocks are reachable in this repo).
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
  const hasGif = isRealUrl(coder.gifPreviewUrl);
  const hasAvatar = isImageAssetReachable(coder.avatarUrl);
  const heroUrl = hasGif ? coder.gifPreviewUrl : hasAvatar ? coder.avatarUrl : null;

  const projectCount = (coder.portfolio || []).length;
  const skills = (coder.skills || []).slice(0, 3);
  const specialty = SPECIALTY_LABELS[coder.specialties?.[0]] || "Developer";
  const location = coder.location || "Remote";
  const initial = (coder.displayName || "?").charAt(0).toUpperCase();

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.25), ease: [0.2, 0, 0, 1] }}
      onClick={onClick}
      className="group text-left bg-white border border-border rounded-[10px] overflow-hidden hover:border-border-hover hover:shadow-[0_4px_14px_-6px_rgba(0,0,0,0.08)] transition-[border-color,box-shadow,transform] duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View profile for ${coder.displayName}`}
    >
      {/* Hero image area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-background-alt">
        {heroUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt={coder.displayName}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover grayscale-[12%] group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-[600ms] ease-out"
            />
            {/* editorial vignette */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 100%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 55%)",
              }}
            />
          </>
        ) : (
          // Placeholder: gradient + large initial
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #f5f5f5 0%, #ededed 45%, #e5e5e5 100%)",
            }}
          >
            <span className="text-[72px] font-semibold text-text-muted/40 tracking-[-0.05em] select-none">
              {initial}
            </span>
            {/* soft noise overlay */}
            <div
              className="absolute inset-0 mix-blend-multiply opacity-[0.35] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.02) 2px 3px)",
              }}
            />
          </div>
        )}

        {/* Project count badge — only show when data is real */}
        {projectCount > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center h-6 px-2 rounded-full bg-black/75 backdrop-blur-sm text-[10px] font-medium text-white tracking-[0.02em] tabular-nums">
            {projectCount} project{projectCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Info section */}
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coder.avatarUrl}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              initial
            )}
          </div>
          {/* Name + verified */}
          <div className="flex-1 min-w-0 flex items-center gap-1">
            <span className="text-[13.5px] font-medium text-text-primary truncate tracking-[-0.01em]">
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
              <span className="text-[11.5px] text-text-secondary tabular-nums tracking-[-0.01em]">
                {coder.hourlyRate.replace("/hr", "")}
              </span>
            )}
          </div>
        </div>

        {/* Specialty · Location */}
        <p className="mt-1 text-[12px] text-text-muted truncate pl-[38px]">
          {specialty} <span className="mx-1 text-text-muted/60">·</span> {location}
        </p>

        {/* Skills row */}
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center h-[22px] px-2 rounded-full border border-border text-[11px] text-text-secondary bg-white whitespace-nowrap"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
