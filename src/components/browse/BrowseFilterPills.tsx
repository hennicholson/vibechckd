"use client";

/**
 * BrowseFilterPills — Horizontal scrollable row of specialty + refinement pills.
 *
 * Two groups:
 *  1. Primary specialty filters (mutually exclusive: All, Frontend, Full stack, ...)
 *  2. "Add-filter" secondary pills (rate, timezone, availability) — dashed outline,
 *     non-functional placeholders for v1.
 *
 * Sizing: matches the dashboard's compact rhythm — h-8 chips, 11px text,
 * rounded-md (the dashboard prefers rounded-md across the board).
 *
 * Mobile: overflow-x-auto with snap.
 */

import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";

type Filter = "all" | Specialty;

interface BrowseFilterPillsProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<string, number>;
  totalCount: number;
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 h-9 px-3 rounded-[10px] text-[12px] font-medium transition-colors duration-150 cursor-pointer snap-start whitespace-nowrap inline-flex items-center ${
        active
          ? "bg-text-primary text-white border border-text-primary"
          : "bg-background text-text-primary border border-border hover:border-border-hover hover:bg-background-alt"
      }`}
    >
      {children}
    </button>
  );
}

function GhostPill({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      title="Coming soon"
      className="flex-shrink-0 h-9 px-3 rounded-[10px] text-[12px] font-medium text-text-muted bg-transparent border border-dashed border-border hover:border-border-hover hover:text-text-secondary transition-colors cursor-not-allowed snap-start whitespace-nowrap inline-flex items-center gap-1"
    >
      <span className="text-[13px] leading-none">+</span>
      {children}
    </button>
  );
}

export default function BrowseFilterPills({
  filter,
  onFilterChange,
  counts,
  totalCount,
}: BrowseFilterPillsProps) {
  return (
    // Right-side-only fade so the leading "All" pill stays fully opaque —
    // it's the most-clicked control and shouldn't be ghosted by the mask.
    // The trailing overflow ("+ availability" at narrow Whop widths) still
    // dissolves into the page bg instead of getting clipped mid-character.
    <div
      className="-mx-1 px-1 edge-fade-r"
      style={{ ["--fade" as string]: "32px" }}
    >
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5 snap-x snap-proximity"
        role="group"
        aria-label="Filter coders"
      >
        <Pill active={filter === "all"} onClick={() => onFilterChange("all")}>
          All <span className={`mx-1 ${filter === "all" ? "text-white/50" : "text-text-muted"}`}>·</span> {totalCount}
        </Pill>
        {SPECIALTIES.map((s) => {
          const active = filter === s;
          return (
            <Pill key={s} active={active} onClick={() => onFilterChange(s)}>
              {SPECIALTY_LABELS[s]}
              <span className={`mx-1 ${active ? "text-white/50" : "text-text-muted"}`}>·</span>
              {counts[s] ?? 0}
            </Pill>
          );
        })}
        {/* Subtle separator */}
        <div className="flex-shrink-0 w-px self-center h-5 bg-border mx-0.5" aria-hidden />
        {/* Refinement pills — placeholder filters */}
        <GhostPill>rate</GhostPill>
        <GhostPill>timezone</GhostPill>
        <GhostPill>availability</GhostPill>
        {/* Trailing spacer ensures the last pill's right edge sits inside the
            scrollable area (so it can be reached) and the mask has space to
            fade out without truncating the pill mid-character. */}
        <div className="flex-shrink-0 w-2" aria-hidden />
      </div>
    </div>
  );
}
