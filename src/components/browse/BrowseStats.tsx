"use client";

/**
 * BrowseStats — calm horizontal-scroll stat ticker.
 *
 * Two strips translated -50% give a seamless infinite loop. Edge fades
 * hide the wrap. No "LIVE" pill, no urgency — just a quiet line of
 * marketplace facts that tells the visitor "there's a real thing
 * behind this page."
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
  const parsed = nums
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n));
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
}

function buildTokens(coders: Coder[]): Token[] {
  const verified = coders.length;
  const available = coders.filter((c) => c.availability === "available").length;

  const rates = coders
    .map((c) => parseRate(c.hourlyRate))
    .filter((n): n is number => n !== null);
  const avgRate =
    rates.length > 0
      ? roundToFive(rates.reduce((s, r) => s + r, 0) / rates.length)
      : null;

  const regions = new Set(
    coders
      .map((c) => {
        const parts = (c.location || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        return parts[parts.length - 1] || "";
      })
      .filter(Boolean)
  );

  const specialties = new Set(coders.flatMap((c) => c.specialties || []));

  const tokens: Token[] = [
    { label: "Verified", value: verified },
    { label: "Available", value: available },
  ];
  if (avgRate !== null) tokens.push({ label: "Avg / hr", value: `$${avgRate}` });
  if (regions.size > 0) tokens.push({ label: "Regions", value: regions.size });
  if (specialties.size > 0)
    tokens.push({ label: "Specialties", value: specialties.size });

  return tokens;
}

function StatToken({ label, value }: Token) {
  return (
    <span className="inline-flex items-baseline gap-2 px-6 whitespace-nowrap">
      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
        {label}
      </span>
      <span className="text-[12px] font-medium text-text-primary tabular-nums">
        {value}
      </span>
    </span>
  );
}

export default function BrowseStats({ coders }: BrowseStatsProps) {
  const tokens = buildTokens(coders);
  if (tokens.length === 0) return null;

  // Slow ticker — 8s per token, capped at 60s. Calm, not urgent.
  const duration = Math.min(60, Math.max(24, tokens.length * 8));

  const Strip = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div
      className="flex items-center shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {tokens.map((t, i) => (
        <StatToken key={`${t.label}-${i}`} {...t} />
      ))}
    </div>
  );

  return (
    <div
      className="relative h-9 overflow-hidden edge-fade-x"
      style={{ ["--fade" as string]: "60px" }}
      role="status"
      aria-label="Marketplace stats"
    >
      <div className="absolute inset-0 flex items-center">
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
