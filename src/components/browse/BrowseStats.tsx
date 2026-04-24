"use client";

/**
 * BrowseStats — 4-card (or 3-card) stat row summarizing the visible coders.
 *
 * Each card:
 *  - small uppercase label with letter-spacing (muted)
 *  - big number in semibold
 *  - optional decoration (green dot for AVAILABLE)
 *
 * The "RESPONSE" stat is intentionally omitted when no response-time data exists
 * on the coder record (spec: only show real stats). The grid collapses to 3-col
 * on desktop in that case.
 */

import type { Coder } from "@/lib/mock-data";

interface BrowseStatsProps {
  coders: Coder[];
}

// Parses "$150-250/hr" or "$200" into an average number (midpoint for ranges).
function parseRate(rate: string): number | null {
  if (!rate) return null;
  const nums = rate.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const parsed = nums.map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
  if (parsed.length === 0) return null;
  if (parsed.length === 1) return parsed[0];
  // midpoint of range
  return Math.round((parsed[0] + parsed[1]) / 2);
}

function roundToFive(n: number): number {
  return Math.round(n / 5) * 5;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-lg px-4 py-3.5 transition-colors hover:border-border-hover">
      <div className="flex items-center gap-1.5">
        {accent}
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="text-[26px] sm:text-[28px] font-semibold text-text-primary tracking-[-0.03em] leading-[1.1] mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}

export default function BrowseStats({ coders }: BrowseStatsProps) {
  const verifiedCount = coders.length;
  const availableCount = coders.filter((c) => c.availability === "available").length;

  const rates = coders.map((c) => parseRate(c.hourlyRate)).filter((n): n is number => n !== null);
  const avgRate = rates.length > 0 ? roundToFive(rates.reduce((s, r) => s + r, 0) / rates.length) : null;

  // Count of distinct countries / major locations represented — stands in for
  // something more meaningful than the "RESPONSE" placeholder called out in the
  // spec. Every coder has a `location` field so this is real data.
  const regions = new Set(
    coders
      .map((c) => {
        const loc = c.location || "";
        // "City, Country" -> last token (country or state)
        const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
        return parts[parts.length - 1] || "";
      })
      .filter(Boolean)
  );
  const regionCount = regions.size;

  // Build stats list — only include cards that have real data.
  const stats: Array<{ label: string; value: React.ReactNode; accent?: React.ReactNode }> = [
    { label: "Verified", value: verifiedCount },
    {
      label: "Available",
      value: availableCount,
      accent: <span className="w-[6px] h-[6px] rounded-full bg-positive flex-shrink-0" />,
    },
  ];
  if (avgRate !== null) {
    stats.push({ label: "Avg / hr", value: `$${avgRate}` });
  }
  if (regionCount > 0) {
    stats.push({ label: "Regions", value: regionCount });
  }

  const gridCols =
    stats.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" :
    stats.length === 3 ? "sm:grid-cols-3" :
    "sm:grid-cols-2";

  return (
    <div className={`grid grid-cols-2 ${gridCols} gap-3`}>
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
      ))}
    </div>
  );
}
