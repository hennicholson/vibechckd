"use client";

/**
 * BrowseFilterPills — Horizontal scrollable row of specialty + refinement pills.
 *
 * Two groups:
 *  1. Primary specialty filters (mutually exclusive: All, Frontend, Full stack, ...)
 *  2. "Add-filter" secondary pills (rate, timezone, availability) — dashed outline,
 *     non-functional placeholders for v1. They are visually present to match the
 *     reference but don't wire to any filter state yet.
 *
 * Mobile: overflow-x-auto with momentum scroll + snap.
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
      className={`flex-shrink-0 h-8 px-3.5 rounded-full text-[12px] font-medium tracking-[-0.005em] transition-all duration-150 cursor-pointer snap-start whitespace-nowrap ${
        active
          ? "bg-[#0a0a0a] text-white border border-[#0a0a0a]"
          : "bg-white text-text-primary border border-border hover:border-border-hover hover:bg-background-alt"
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
      className="flex-shrink-0 h-8 px-3 rounded-full text-[12px] font-medium tracking-[-0.005em] text-text-muted bg-transparent border border-dashed border-border hover:border-border-hover hover:text-text-secondary transition-colors cursor-not-allowed snap-start whitespace-nowrap inline-flex items-center gap-1"
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
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5 snap-x snap-proximity">
      <Pill active={filter === "all"} onClick={() => onFilterChange("all")}>
        All <span className={filter === "all" ? "text-white/50 mx-0.5" : "text-text-muted mx-0.5"}>·</span> {totalCount}
      </Pill>
      {SPECIALTIES.map((s) => {
        const active = filter === s;
        return (
          <Pill key={s} active={active} onClick={() => onFilterChange(s)}>
            {SPECIALTY_LABELS[s]}{" "}
            <span className={active ? "text-white/50 mx-0.5" : "text-text-muted mx-0.5"}>·</span>{" "}
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
    </div>
  );
}
