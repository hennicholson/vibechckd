"use client";

/**
 * BrowseStats — 4-card (or 3-card) stat row summarizing the visible coders.
 *
 * Matches the dashboard card chrome:
 *  - rounded-[10px] border-border
 *  - p-4 (no shadow, no hover effect — dashboard cards stay flat)
 *  - 10px font-mono uppercase tracking-wider label
 *  - 22px semibold tabular-nums value
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
    <div className="border border-border rounded-[10px] p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {accent}
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-[22px] font-semibold text-text-primary tabular-nums leading-tight">
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

  // Distinct countries / regions represented (from the trailing token of each coder.location).
  const regions = new Set(
    coders
      .map((c) => {
        const loc = c.location || "";
        const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
        return parts[parts.length - 1] || "";
      })
      .filter(Boolean)
  );
  const regionCount = regions.size;

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
    stats.length === 4 ? "sm:grid-cols-2 md:grid-cols-4" :
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
