"use client";

/**
 * BrowseStats — horizontal news-ticker-style live stats bar.
 *
 * Replaces the old 4-card grid with a thin scrolling ticker that summarises
 * the visible coders. Two copies of the stat list are rendered side-by-side
 * and translated -50% over a long duration to give a seamless infinite loop.
 * Faded edges hide the wraparound; a leading pulsing dot signals "live".
 */

import type { ReactNode } from "react";
import type { Coder } from "@/lib/mock-data";

interface BrowseStatsProps {
  coders: Coder[];
}

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

interface Token {
  label: string;
  value: ReactNode;
  accent?: ReactNode;
}

function buildTokens(coders: Coder[]): Token[] {
  const verified = coders.length;
  const available = coders.filter((c) => c.availability === "available").length;

  const rates = coders
    .map((c) => parseRate(c.hourlyRate))
    .filter((n): n is number => n !== null);
  const avgRate = rates.length > 0 ? roundToFive(rates.reduce((s, r) => s + r, 0) / rates.length) : null;
  const topRate = rates.length > 0 ? Math.max(...rates) : null;

  const regions = new Set(
    coders
      .map((c) => {
        const parts = (c.location || "").split(",").map((p) => p.trim()).filter(Boolean);
        return parts[parts.length - 1] || "";
      })
      .filter(Boolean)
  );

  const specialties = new Set(coders.flatMap((c) => c.specialties || []));

  const tokens: Token[] = [
    { label: "Verified", value: verified },
    {
      label: "Available now",
      value: available,
      accent: <span className="w-[7px] h-[7px] rounded-full bg-positive flex-shrink-0" />,
    },
  ];
  if (avgRate !== null) tokens.push({ label: "Avg / hr", value: `$${avgRate}` });
  if (topRate !== null && rates.length > 1) {
    tokens.push({ label: "Top rate", value: `$${topRate}/hr` });
  }
  if (regions.size > 0) tokens.push({ label: "Regions", value: regions.size });
  if (specialties.size > 0) tokens.push({ label: "Specialties", value: specialties.size });

  return tokens;
}

function StatToken({ label, value, accent }: Token) {
  return (
    <span className="inline-flex items-center gap-1.5 px-5">
      {accent}
      <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-[12px] font-medium text-text-primary tabular-nums">
        {value}
      </span>
    </span>
  );
}

function Divider() {
  return <span className="text-text-muted/40 select-none">·</span>;
}

export default function BrowseStats({ coders }: BrowseStatsProps) {
  const tokens = buildTokens(coders);
  if (tokens.length === 0) return null;

  // Pace the marquee so a single full cycle takes about 6 seconds per token —
  // slow enough to read, fast enough to feel alive. Caps at 60s so very wide
  // lists still loop in a reasonable time.
  const duration = Math.min(60, Math.max(20, tokens.length * 6));

  // Render the same token strip twice: animation translates -50% so the second
  // copy seamlessly continues the first. `aria-hidden` on the duplicate so
  // screen readers only see one set.
  const Strip = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div
      className="flex items-center shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {tokens.map((t, i) => (
        <span key={`${t.label}-${i}`} className="inline-flex items-center">
          <StatToken {...t} />
          {i < tokens.length - 1 && <Divider />}
        </span>
      ))}
      {/* trailing divider so the join between the two strips reads cleanly */}
      <span className="px-5">
        <Divider />
      </span>
    </div>
  );

  return (
    <div
      className="relative h-10 border-y border-border bg-background-alt overflow-hidden"
      role="status"
      aria-label="Live marketplace stats"
    >
      {/* Live indicator pinned to the left, above the gradient. */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center gap-1.5 pl-4 pr-3 bg-background-alt">
        <span
          className="w-[6px] h-[6px] rounded-full bg-negative"
          style={{ animation: "livePulse 1.6s ease-in-out infinite" }}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Live
        </span>
      </div>

      {/* Left fade — sits between the LIVE pill and the moving strip. */}
      <div className="absolute left-[80px] top-0 bottom-0 w-10 bg-gradient-to-r from-background-alt to-transparent z-10 pointer-events-none" />
      {/* Right fade. */}
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background-alt to-transparent z-10 pointer-events-none" />

      {/* The moving rail. We pad-left to clear the LIVE pill on first render
          before the animation has translated anything. */}
      <div
        className="absolute inset-y-0 left-[80px] right-0 flex items-center"
      >
        <div
          className="flex w-max"
          style={{ animation: `marquee ${duration}s linear infinite` }}
        >
          <Strip />
          <Strip ariaHidden />
        </div>
      </div>
    </div>
  );
}
