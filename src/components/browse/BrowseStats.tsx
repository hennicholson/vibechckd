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

  // Bidirectional fade via CSS mask. Wide fade zones (~160px each side)
  // make the dissolve obviously gradual instead of looking like a clipped
  // edge. We use rgba() instead of `transparent` because the named keyword
  // maps to rgba(0,0,0,0) — fine for an alpha mask but ambiguous to read,
  // and explicitly `mask-mode: alpha` so Chrome / Safari both treat the
  // gradient as alpha-only (no luminance fallback).
  const mask =
    "linear-gradient(to right, rgba(0,0,0,0) 0, rgba(0,0,0,0) 40px, rgba(0,0,0,1) 200px, rgba(0,0,0,1) calc(100% - 200px), rgba(0,0,0,0) calc(100% - 40px), rgba(0,0,0,0) 100%)";

  return (
    <div
      className="relative h-10 border-y border-border bg-background-alt overflow-hidden"
      role="status"
      aria-label="Live marketplace stats"
    >
      {/* Masked viewport — applies the alpha fade to the moving strip. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: mask,
          WebkitMaskImage: mask,
          maskMode: "alpha",
          WebkitMaskMode: "alpha",
        }}
      >
        <div
          className="flex w-max h-full items-center"
          style={{ animation: `marquee ${duration}s linear infinite` }}
        >
          <Strip />
          <Strip ariaHidden />
        </div>
      </div>

      {/* LIVE pill — sits on top, with its own bg gradient that crossfades
          to transparent over the same range where the strip mask is fading
          the text *in*. The two transitions line up, so there's no visible
          boundary between the pill and the ticker. We use rgba(250,250,250)
          (the literal value of --color-background-alt) so the gradient
          interpolates within one color rather than through transparent
          black — the latter produces a muddy mid-grey halo. */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 flex items-center gap-1.5 pl-4 pr-3 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(250,250,250,1) 0, rgba(250,250,250,1) 90px, rgba(250,250,250,0) 200px)",
          width: "200px",
        }}
      >
        <span
          className="w-[6px] h-[6px] rounded-full bg-negative"
          style={{ animation: "livePulse 1.6s ease-in-out infinite" }}
        />
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Live
        </span>
      </div>
    </div>
  );
}
