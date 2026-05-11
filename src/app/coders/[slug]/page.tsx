"use client";

/**
 * Public creator profile — /coders/[slug].
 *
 * Conversion-first profile surface. When a client lands here from a browse
 * card or a shared DM link, the page has one job: get them to start a
 * project (or build a team) with this creator.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ sticky header (back, share, favorite)                               │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │ HERO                                                                 │
 *   │   ▸ avatar (animated VerifiedSeal in corner)                        │
 *   │   ▸ name + specialty                                                 │
 *   │   ▸ tagline (one line of voice)                                      │
 *   │   ▸ Vetted proof row (vetted date · projects · response time)        │
 *   │   ▸ Primary CTA (Start a project with [Name]) + secondary (Message)  │
 *   ├─────────────────────────────────────────────────────────────────────┤
 *   │  Work column (2/3)            │  Right rail (1/3)                    │
 *   │  ─ Portfolio grid (16:10)     │  ─ About                             │
 *   │                               │  ─ Skills                            │
 *   │                               │  ─ Tools                             │
 *   │                               │  ─ Reviews placeholder               │
 *   │                               │  ─ Socials                           │
 *   └─────────────────────────────────────────────────────────────────────┘
 *   mobile sticky bottom CTA bar (the conversion lock)
 *
 * Mobile-first because profile pages are heavily shared via DM links.
 */

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import PageShell from "@/components/PageShell";
import Button from "@/components/Button";
import VerifiedSeal from "@/components/VerifiedSeal";
import FavoriteButton from "@/components/FavoriteButton";
import Modal from "@/components/Modal";
import PortfolioFolder from "@/components/PortfolioFolder";
import { useFavorites } from "@/lib/use-favorites";
import {
  containerVariants,
  itemVariants,
  sectionVariants,
} from "@/lib/motion";
import {
  SPECIALTY_LABELS,
  type Coder,
  type PortfolioItem,
} from "@/lib/mock-data";

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function formatVettedDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// First-name addressable greeting — "Start a project with Sara" reads
// warmer than "Start a project with Sara Chen". Fallback to the whole
// display name when there's no obvious split point.
function firstName(displayName: string): string {
  const trimmed = (displayName || "").trim();
  if (!trimmed) return "this creator";
  return trimmed.split(/\s+/)[0];
}

export default function CoderProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [coder, setCoder] = useState<Coder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [initiating, setInitiating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Primary conversion handler. "project" = start a project room with this
  // creator pre-assigned; "inquiry" = open a lightweight DM thread. Logged-
  // out clients get bounced to register with the original intent preserved
  // (so the post-signup redirect lands them back here ready to convert).
  const handleInquiry = async (type: "project" | "inquiry") => {
    if (authStatus !== "authenticated" || !coder) {
      router.push(
        `/register?role=client&intent=${type}&coder=${encodeURIComponent(slug)}`
      );
      return;
    }
    setInitiating(type);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coderId: coder.id,
          coderName: coder.displayName,
          type,
        }),
      });
      const data = await res.json();
      if (data.projectId) {
        router.push(`/dashboard/projects/${data.projectId}`);
      } else {
        setInitiating(null);
      }
    } catch {
      setInitiating(null);
    }
  };

  // Native share when available (mobile, where this surface is most-
  // shared), fallback to clipboard with a 2s confirmation pill.
  const handleShare = async () => {
    if (!coder) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `${coder.displayName} — vibechckd`,
      text: `${coder.displayName} on vibechckd — vetted ${(
        SPECIALTY_LABELS[coder.specialties?.[0]] || "Developer"
      ).toLowerCase()}.`,
      url,
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — silent fail (the share button is non-critical)
    }
  };

  // Title sync — explicit so DM previews show the right name.
  useEffect(() => {
    if (coder) {
      document.title = `${coder.displayName} — vibechckd`;
    } else {
      document.title = "vibechckd";
    }
    return () => {
      document.title = "vibechckd";
    };
  }, [coder]);

  // Per-slug fetch (not the full /api/coders list — see route comment).
  useEffect(() => {
    let cancelled = false;
    async function fetchCoder() {
      setLoading(true);
      setFetchError(false);
      setNotFound(false);
      try {
        const res = await fetch(`/api/coders/${encodeURIComponent(slug)}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setFetchError(true);
          return;
        }
        const found = (await res.json()) as Coder;
        if (!cancelled) setCoder(found);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCoder();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <PageShell>
        <div className="max-w-[1120px] mx-auto px-4 md:px-8 py-6 md:py-10">
          {/* Skeleton mirrors the real layout so there's no jolt when content
              lands — same hero rectangle, same 2-up portfolio rows, same
              right-rail width. */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-4 w-24 rounded skeleton-shimmer" />
            <div className="h-8 w-20 rounded-md skeleton-shimmer" />
          </div>
          <div className="rounded-[14px] border border-border p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              <div className="w-[88px] h-[88px] md:w-[104px] md:h-[104px] rounded-[14px] skeleton-shimmer" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-64 rounded skeleton-shimmer" />
                <div className="h-4 w-80 rounded skeleton-shimmer" />
                <div className="h-3 w-56 rounded skeleton-shimmer" />
              </div>
              <div className="flex gap-2">
                <div className="h-11 w-[180px] rounded-lg skeleton-shimmer" />
                <div className="h-11 w-[100px] rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 nav:grid-cols-[1fr_280px] gap-6 md:gap-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-[16/10] rounded-[10px] skeleton-shimmer"
                />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 w-full rounded-[10px] skeleton-shimmer" />
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (fetchError) {
    return (
      <PageShell>
        <div className="max-w-[640px] mx-auto px-4 md:px-6 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-5 h-5 text-[#ef4444]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Something went wrong
          </h1>
          <p className="text-[14px] text-text-muted mt-2">
            We couldn&apos;t load this profile. Please try again.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-[44px]"
          >
            Retry
          </Button>
        </div>
      </PageShell>
    );
  }

  if (notFound || !coder) {
    return (
      <PageShell>
        <div className="max-w-[640px] mx-auto px-4 md:px-6 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Profile not found
          </h1>
          <p className="text-[14px] text-text-muted mt-2">
            This creator doesn&apos;t exist or has been removed.
          </p>
          <Button href="/browse" variant="secondary" className="mt-6">
            Browse creators
          </Button>
        </div>
      </PageShell>
    );
  }

  const specialtyLabel = coder.specialties?.[0]
    ? SPECIALTY_LABELS[coder.specialties[0]] || coder.specialties[0]
    : "Developer";
  const portfolio = coder.portfolio || [];
  const projectCount = portfolio.length;
  const vettedSince = formatVettedDate(coder.joinedAt);
  const fName = firstName(coder.displayName);
  const initialLetters = coder.displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  // Vetted proof row — these are the three lines that re-assert the
  // "VETTED" promise after the seal in the corner. Order matters:
  // identity (date) → output (projects) → service (response). Each one
  // is filtered if the data isn't there so we never show "—".
  const vettedProof: Array<{ label: string; value: string }> = [];
  if (vettedSince) vettedProof.push({ label: "Vetted", value: vettedSince });
  if (projectCount > 0)
    vettedProof.push({
      label: "Projects",
      value: String(projectCount),
    });
  if (coder.yearsExperience)
    vettedProof.push({
      label: "Experience",
      value: `${coder.yearsExperience} yr${coder.yearsExperience === 1 ? "" : "s"}`,
    });
  // Response time is a real product metric we don't have yet — use
  // availability state as a proxy that still reads as a service promise.
  const responseProxy =
    coder.availability === "available"
      ? "Replies in ~24h"
      : coder.availability === "selective"
        ? "Selective"
        : null;
  if (responseProxy)
    vettedProof.push({ label: "Response", value: responseProxy });

  const primaryCtaLabel =
    initiating === "project"
      ? "Starting…"
      : `Start a project with ${fName}`;
  const secondaryCtaLabel =
    initiating === "inquiry" ? "Sending…" : `Message ${fName}`;

  return (
    <PageShell>
      <div className="max-w-[1120px] mx-auto px-4 md:px-8 pb-28 nav:pb-12">
        {/* Sticky header — mirrors the dashboard / browse pattern. Solid bg
            so scrolling content is fully masked; subtle gradient sliver
            underneath fades the bottom edge so the hero doesn't slam
            into a hard line. */}
        <div className="sticky top-0 z-10 bg-background pt-4 md:pt-6 pb-3 -mx-4 md:-mx-8 px-4 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/browse")}
              className="inline-flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] md:min-h-[32px] -ml-1 px-1"
              aria-label="Back to browse"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Browse</span>
            </button>
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] truncate flex-1 text-center hidden md:block">
              {coder.displayName}
            </h1>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="relative inline-flex items-center gap-1.5 px-2.5 md:px-3 h-[36px] md:h-[32px] rounded-md text-[12px] font-medium text-text-secondary border border-border hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer min-w-[44px] justify-center"
                aria-label="Share profile"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.464 2.684m5.464-2.684L8.684 16.026m9.032-4.026A3 3 0 1112.252 9.342m5.464 2.658L8.684 7.974"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {copied ? "Copied" : "Share"}
                </span>
              </button>
              <FavoriteButton
                favorited={isFavorited(coder.id)}
                onClick={() => toggleFavorite(coder.id)}
                size="sm"
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="pt-4 md:pt-6"
        >
          {/* HERO — the conversion engine. Card uses the same 10px radius +
              border treatment as cards elsewhere, but slightly bigger 14px
              radius to read as a section container rather than a list item. */}
          <motion.section
            variants={sectionVariants}
            className="border border-border rounded-[14px] p-5 md:p-8 bg-background"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-7">
              {/* Avatar — square 14px-rounded tile (matches popup), with a
                  small animated VerifiedSeal in the corner. This is the
                  "VETTED" moment: it animates on mount, drawing the eye
                  before the client reads the rest of the hero. */}
              <div className="relative flex-shrink-0">
                <div className="w-[88px] h-[88px] md:w-[104px] md:h-[104px] rounded-[14px] overflow-hidden bg-surface-muted pfp-static">
                  {coder.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coder.avatarUrl}
                      alt={coder.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[28px] md:text-[32px] font-semibold text-text-muted">
                      {initialLetters}
                    </div>
                  )}
                </div>
                {coder.verified && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-background rounded-full p-0.5 shadow-[0_2px_6px_-1px_rgba(0,0,0,0.08)]">
                    <VerifiedSeal size="lg" animate />
                  </div>
                )}
              </div>

              {/* Identity column — name, specialty, tagline, vetted proof. */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[24px] md:text-[28px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.15]">
                    {coder.displayName}
                  </h2>
                </div>
                <p className="text-[13px] text-text-secondary mt-1">
                  <span className="text-text-primary font-medium">
                    {coder.title || specialtyLabel}
                  </span>
                  {coder.location && (
                    <>
                      <span className="text-text-muted"> · </span>
                      <span className="text-text-muted">{coder.location}</span>
                    </>
                  )}
                  {coder.hourlyRate && (
                    <>
                      <span className="text-text-muted"> · </span>
                      <span className="text-text-muted">{coder.hourlyRate}</span>
                    </>
                  )}
                </p>
                {coder.tagline && (
                  <p className="text-[15px] md:text-[16px] text-text-primary mt-3 leading-[1.5] tracking-[-0.005em]">
                    “{coder.tagline}”
                  </p>
                )}

                {/* Vetted proof row — the three lines that re-assert the
                    seal. Mono labels (tiny, uppercase) over weighty values.
                    Wraps gracefully on mobile so the row reads as a small
                    grid instead of overflowing. */}
                {vettedProof.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-3">
                    {vettedProof.map((p) => (
                      <div key={p.label} className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted">
                          {p.label}
                        </span>
                        <span className="text-[13px] font-medium text-text-primary tabular-nums mt-0.5">
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary CTA stack — desktop only. On mobile this is hidden
                  here and pinned to the bottom of the viewport for thumb-
                  reach (see the sticky bottom bar below). */}
              <div className="hidden nav:flex flex-col gap-2 flex-shrink-0 w-[220px]">
                <Button
                  onClick={() => handleInquiry("project")}
                  disabled={!!initiating}
                  size="lg"
                  className="w-full min-h-[44px] justify-center"
                >
                  {primaryCtaLabel}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleInquiry("inquiry")}
                  disabled={!!initiating}
                  size="lg"
                  className="w-full min-h-[44px] justify-center"
                >
                  {secondaryCtaLabel}
                </Button>
                <p className="text-[11px] text-text-muted text-center mt-1 leading-[1.5]">
                  Free to start · You only pay on milestones
                </p>
              </div>
            </div>

            {/* Tablet CTA row — between md and nav, the sidebar CTAs stack
                below the hero info instead of next to it. */}
            <div className="nav:hidden hidden md:flex gap-2 mt-6">
              <Button
                onClick={() => handleInquiry("project")}
                disabled={!!initiating}
                size="lg"
                className="flex-1 min-h-[44px] justify-center"
              >
                {primaryCtaLabel}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleInquiry("inquiry")}
                disabled={!!initiating}
                size="lg"
                className="min-h-[44px]"
              >
                {secondaryCtaLabel}
              </Button>
            </div>
          </motion.section>

          {/* MAIN — work column + right rail. Single column on mobile so
              the portfolio still gets full width; splits at the nav
              breakpoint to a 1fr + 280px grid. */}
          <div className="grid grid-cols-1 nav:grid-cols-[1fr_280px] gap-8 md:gap-12 mt-8 md:mt-12">
            {/* Work — the reason they clicked through. */}
            <motion.section variants={itemVariants}>
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">
                  What {fName} builds
                </h3>
                {projectCount > 0 && (
                  <span className="text-[11px] font-mono text-text-muted tabular-nums">
                    {projectCount} {projectCount === 1 ? "project" : "projects"}
                  </span>
                )}
              </div>

              {projectCount > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5"
                >
                  {portfolio.map((item) => (
                    <PortfolioTile
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="border border-dashed border-border rounded-[10px] py-12 px-6 text-center">
                  <p className="text-[13px] text-text-secondary">
                    Portfolio coming soon
                  </p>
                  <p className="text-[12px] text-text-muted mt-1">
                    {fName} is vetted but hasn&apos;t published work yet.
                    Reach out — they&apos;ll share samples directly.
                  </p>
                </div>
              )}

              {/* Reviews — graceful placeholder until the endorsements data
                  model ships. Stays on the page so the section structure
                  reads as final, not half-built. */}
              <motion.div variants={itemVariants} className="mt-10 md:mt-14">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">
                    Endorsements
                  </h3>
                </div>
                <div className="border border-dashed border-border rounded-[10px] py-8 px-6 text-center">
                  <div className="w-9 h-9 mx-auto rounded-full bg-surface-muted flex items-center justify-center mb-2.5">
                    <svg
                      className="w-4 h-4 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.6}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-[12px] text-text-secondary">
                    Endorsements from past clients land here.
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Every {fName} project ships with a verified client review.
                  </p>
                </div>
              </motion.div>
            </motion.section>

            {/* Right rail — about, skills, tools, socials. Scans top-to-
                bottom in seconds; sticky on desktop so it stays visible
                while the client scrolls work. */}
            <motion.aside
              variants={itemVariants}
              className="nav:sticky nav:top-[88px] nav:self-start space-y-7"
            >
              {coder.bio && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted mb-2.5">
                    About
                  </p>
                  <p className="text-[13px] text-text-secondary leading-[1.65]">
                    {coder.bio}
                  </p>
                </div>
              )}

              {(coder.skills || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted mb-2.5">
                    Stack
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coder.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center text-[12px] text-text-secondary bg-surface-muted rounded-md px-2 py-1"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(coder.tools || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted mb-2.5">
                    Tools
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coder.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center text-[12px] font-mono text-text-secondary border border-border rounded-md px-2 py-1"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(coder.githubUrl ||
                coder.twitterUrl ||
                coder.linkedinUrl ||
                coder.websiteUrl) && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted mb-2.5">
                    Elsewhere
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coder.githubUrl && (
                      <SocialLink
                        href={ensureHttps(coder.githubUrl)}
                        label="GitHub"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                      </SocialLink>
                    )}
                    {coder.twitterUrl && (
                      <SocialLink
                        href={ensureHttps(coder.twitterUrl)}
                        label="X / Twitter"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </SocialLink>
                    )}
                    {coder.linkedinUrl && (
                      <SocialLink
                        href={ensureHttps(coder.linkedinUrl)}
                        label="LinkedIn"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </SocialLink>
                    )}
                    {coder.websiteUrl && (
                      <SocialLink
                        href={ensureHttps(coder.websiteUrl)}
                        label="Website"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </SocialLink>
                    )}
                  </div>
                </div>
              )}

              {/* Quiet trust reinforcement — the VETTED sentence under the
                  rail. Same idea as the seal in the hero corner, but
                  spelled out here for clients who scroll past the visual. */}
              <div className="border-t border-border pt-5">
                <div className="flex items-start gap-2.5">
                  <VerifiedSeal size="sm" className="mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-text-muted leading-[1.6]">
                    Every creator on vibechckd is vetted by humans before they
                    appear here.{" "}
                    <a
                      href="/about/vetting"
                      className="text-text-secondary underline decoration-text-muted/40 hover:decoration-text-primary hover:text-text-primary transition-colors"
                    >
                      How vetting works
                    </a>
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </div>

      {/* Mobile sticky CTA bar — the conversion lock. Always within thumb
          reach on the device where this surface is most-shared. Hidden at
          the nav breakpoint where the hero CTA stack takes over. */}
      <div className="nav:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 max-w-[1120px] mx-auto">
          <Button
            onClick={() => handleInquiry("project")}
            disabled={!!initiating}
            size="lg"
            className="flex-1 min-h-[44px] justify-center"
          >
            {primaryCtaLabel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleInquiry("inquiry")}
            disabled={!!initiating}
            size="lg"
            className="min-h-[44px] px-4"
            aria-label={`Message ${fName}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </Button>
        </div>
      </div>

      <Modal
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        size="full"
      >
        {selectedItem && (
          <PortfolioFolder
            item={selectedItem}
            onBack={() => setSelectedItem(null)}
          />
        )}
      </Modal>
    </PageShell>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

/**
 * Portfolio tile — 16:10 hero rectangle, exact match for the browse card
 * visual language. The hero is the headline; title + asset hint live
 * beneath in tight 14px/11px typography.
 *
 * Live previews get a tiny pulsing "LIVE" pip in the top right; static
 * thumbnails get a subtle hover lift. Either way the whole tile is one
 * click target that opens the PortfolioFolder modal.
 */
function PortfolioTile({
  item,
  onClick,
}: {
  item: PortfolioItem;
  onClick: () => void;
}) {
  const livePreview = item.assets.find((a) => a.type === "live_preview");
  const fallbackThumb =
    item.thumbnailUrl ||
    item.assets.find((a) => a.type === "image")?.url ||
    "";
  const hasImage =
    fallbackThumb &&
    (fallbackThumb.startsWith("http") || fallbackThumb.startsWith("/"));
  const initial = (item.title || "?").charAt(0).toUpperCase();

  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      className="group text-left rounded-[10px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      aria-label={`Open ${item.title}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-surface-muted transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
        {livePreview ? (
          <>
            <div
              className="absolute inset-0 origin-top-left grayscale group-hover:grayscale-0 transition-[filter] duration-500"
              style={{
                width: "200%",
                height: "200%",
                transform: "scale(0.5)",
              }}
            >
              <iframe
                src={livePreview.url}
                title={item.title}
                className="w-full h-full border-0 pointer-events-none"
                scrolling="no"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-[3px] rounded bg-black/65 backdrop-blur-sm z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[9px] font-medium text-white uppercase tracking-wider">
                Live
              </span>
            </span>
          </>
        ) : hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fallbackThumb}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
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
      <div className="mt-3 px-0.5">
        <h4 className="text-[14px] font-medium text-text-primary leading-tight truncate">
          {item.title}
        </h4>
        {item.description && (
          <p className="text-[12px] text-text-muted leading-tight mt-1 line-clamp-1">
            {item.description}
          </p>
        )}
      </div>
    </motion.button>
  );
}

/**
 * Small icon-only social link used in the right rail. Matches the chip
 * sizing in the Stack/Tools rows so the three groups line up visually.
 */
function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
    >
      {children}
    </a>
  );
}
