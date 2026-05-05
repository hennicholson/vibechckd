"use client";

/**
 * Browse — the editorial marketplace surface.
 *
 * Layout:
 *  [ BrowseSidebar | main column ]
 *    main column:
 *      search  (sticky ⌘K)
 *      header row (VERIFIED ✓ {n} coders   /   SORT: {…})
 *      BrowseFilterPills
 *      BrowseStats
 *      Grid of BrowseCoderCard  (3 → 2 → 1 cols)
 *
 * Responsive:
 *  md+  (>= 768px): sidebar visible, 3-col grid
 *  sm   (>= 640px): sidebar hidden behind top bar + drawer, 2-col grid
 *  base (< 640px):  1-col grid
 *
 * Data:
 *  - /api/coders returns Coder[] directly (response is an array, not wrapped)
 *  - Filter counts computed from the active search set (so sidebar reflects current query)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { uiRole } from "@/lib/dashboard-nav";
import VerifiedSeal from "@/components/VerifiedSeal";
import CoderProfilePopup from "@/components/CoderProfilePopup";
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  coders as mockCoders,
  type Coder,
  type Specialty,
} from "@/lib/mock-data";

import BrowseSidebar from "@/components/browse/BrowseSidebar";
import BrowseSearchBar from "@/components/browse/BrowseSearchBar";
import BrowseCoderCard from "@/components/browse/BrowseCoderCard";
import BrowseStats from "@/components/browse/BrowseStats";
import BrowseLoadingLottie from "@/components/browse/BrowseLoadingLottie";
import BrowseIntroOverlay from "@/components/browse/BrowseIntroOverlay";

type Filter = "all" | Specialty;

// ── "Project types" dropdown — vetted.cv-style single-trigger filter
//    that replaces the multi-pill row + sort dropdown on the main view.
//    Clicking a specialty applies it; "All" resets. Counts come from the
//    parent's already-computed specialty-aware tallies so the menu
//    reflects the current search context.
function SpecialtyDropdown({
  filter,
  onFilterChange,
  counts,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    filter === "all" ? "Discipline" : SPECIALTY_LABELS[filter] || "Discipline";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative inline-flex items-center gap-1.5 px-2 py-1 text-[13px] font-medium transition-colors cursor-pointer ${
          filter !== "all"
            ? "text-text-primary after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[1.5px] after:bg-text-primary"
            : "text-text-muted hover:text-text-primary"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-background border border-border rounded-md shadow-[0_6px_24px_-8px_rgba(0,0,0,0.08)] py-1 z-30"
            role="listbox"
          >
            <li>
              <button
                onClick={() => {
                  onFilterChange("all");
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                  filter === "all"
                    ? "text-text-primary font-medium bg-surface-muted"
                    : "text-text-secondary hover:bg-background-alt hover:text-text-primary"
                }`}
                role="option"
                aria-selected={filter === "all"}
              >
                All
              </button>
            </li>
            {SPECIALTIES.map((s) => {
              const n = counts[s] ?? 0;
              return (
                <li key={s}>
                  <button
                    onClick={() => {
                      onFilterChange(s);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                      filter === s
                        ? "text-text-primary font-medium bg-surface-muted"
                        : "text-text-secondary hover:bg-background-alt hover:text-text-primary"
                    }`}
                    role="option"
                    aria-selected={filter === s}
                  >
                    <span>{SPECIALTY_LABELS[s]}</span>
                    <span className="text-[11px] font-mono text-text-muted tabular-nums">{n}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mobile top bar + drawer (shown only below md) ──
function MobileTopBar({
  filter,
  onFilterChange,
  searchValue,
  onSearchChange,
  totalCount,
  counts,
}: {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  counts: Record<string, number>;
}) {
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="h-[48px] flex items-center justify-between px-4">
        <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
          vibechckd
          <VerifiedSeal size="sm" />
        </Link>
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          className="flex flex-col justify-center items-center w-10 h-10 cursor-pointer"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
        >
          <span
            className={`block w-4 h-[1.5px] bg-text-primary transition-all duration-200 ${drawerOpen ? "translate-y-[3px] rotate-45" : ""}`}
          />
          <span
            className={`block w-4 h-[1.5px] bg-text-primary transition-all duration-200 mt-[5px] ${drawerOpen ? "-translate-y-[2px] -rotate-45" : ""}`}
          />
        </button>
      </div>
      {/* Mobile search */}
      <div className="px-4 pb-3">
        <BrowseSearchBar value={searchValue} onChange={onSearchChange} />
      </div>

      {/* Drawer — fixed overlay below the top row so content underneath isn't
          pushed down. Filter UI is intentionally NOT duplicated here; the
          BrowseFilterPills row on the page already handles filtering on mobile. */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-x-0 top-[48px] bottom-0 z-40 bg-black/30"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden fixed inset-x-0 top-[48px] z-50 bg-background border-b border-border max-h-[calc(100vh-48px)] overflow-y-auto"
            >
              <div className="px-4 py-3 space-y-0.5">
                <Link href="/browse" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-primary font-medium bg-surface-muted">
                  Browse Talent
                </Link>
                <Link href="/dashboard/teams/new" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary">
                  Build a Team
                </Link>
                <Link href="/dashboard/projects" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary">
                  Projects
                </Link>
                <Link href="/dashboard/inbox" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary">
                  Messages
                </Link>
                {session?.user ? (
                  <div className="border-t border-border pt-2 mt-2 space-y-0.5">
                    <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary">Dashboard</Link>
                    <Link href="/dashboard/profile" onClick={() => setDrawerOpen(false)} className="block px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary">Profile</Link>
                    <button
                      onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="block w-full text-left px-2 py-2 rounded-md text-[14px] text-text-muted hover:text-text-primary cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-border pt-3 mt-2 flex gap-2">
                    <Link
                      href="/login"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 text-center py-2 text-[13px] text-text-primary border border-border rounded-md"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/apply"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 text-center py-2 text-[13px] font-medium text-white bg-text-primary rounded-md"
                    >
                      Apply
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BrowsePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const viewerRawRole = (session?.user as { role?: string } | undefined)?.role;
  // Map DB roles → UI role buckets ("client" | "creator" | undefined).
  // Logged-out users get "guest" so the card omits the action button.
  const viewerRole: "client" | "creator" | "guest" = !session?.user
    ? "guest"
    : uiRole(viewerRawRole) ?? "guest";

  const [coders, setCoders] = useState<Coder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoder, setSelectedCoder] = useState<Coder | null>(null);

  // Brand intro: every entry to /browse plays the full check-intro
  // Lottie before the gallery is revealed. Re-asserts the "vetted"
  // promise the marketplace is built on. The overlay manages its own
  // lifecycle (Lottie onComplete or hard-timeout fallback) and calls
  // back here when it's safe to show the page.
  const [introDone, setIntroDone] = useState(false);

  // Scroll-aware sticky header: at the top of the page the ticker sits
  // above the search; as soon as the user scrolls the grid (>24px) the
  // ticker fades + collapses and only the search stays pinned. Listens
  // on the inner <main> element since that's the actual scroll
  // container (the page has overflow:hidden on its outer shell).
  const mainRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrolled(el.scrollTop > 24);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Card primary-action handler. Client → team-builder pre-filled; creator
  // → open or create a 1:1 DM thread (POST /api/dm/threads is find-or-
  // create so we get back the threadId regardless).
  const handlePrimaryAction = useCallback(
    async (coder: Coder) => {
      if (viewerRole === "client") {
        router.push(`/dashboard/teams/new?coder=${encodeURIComponent(coder.id)}`);
        return;
      }
      if (viewerRole === "creator") {
        try {
          const res = await fetch("/api/dm/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipientId: coder.id }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { threadId: string };
          router.push(`/dashboard/inbox?c=${data.threadId}`);
        } catch {
          // silent — user can still tap the card to view the profile
        }
      }
    },
    [router, viewerRole]
  );

  const loadCoders = useCallback(() => {
    setIsLoading(true);
    setFetchError(false);
    fetch("/api/coders")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCoders(data);
        else if (Array.isArray(data?.coders)) setCoders(data.coders);
        else throw new Error("Unexpected response shape");
      })
      .catch(() => {
        // Non-prod fallback so the marketplace still renders when the DB is
        // unreachable in local/dev. In production this path shows the error UI.
        if (process.env.NODE_ENV !== "production") {
          setCoders(mockCoders);
        } else {
          setFetchError(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadCoders();
  }, [loadCoders]);

  // Search-only filtered list (used to compute counts so filter counts
  // reflect the current query even before specialty filtering).
  //
  // Ranking model: each token of the query is matched independently against
  // a set of weighted fields per coder. A coder must hit AT LEAST one
  // field per token to qualify (AND across tokens, OR across fields), and
  // their total score determines the order. This makes searches like
  // "react brooklyn" or "figma full stack" pair developers correctly
  // instead of relying on a single substring match.
  const searchFiltered = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return coders;
    const tokens = raw
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    // Field weights — higher = stronger pull. Tuned so an exact skill or
    // specialty-label match beats a coincidental substring in a portfolio
    // title; an exact name match (e.g. someone searching for a specific
    // creator they've heard of) still wins outright.
    const W = {
      nameExact: 100,
      namePrefix: 60,
      nameSubstr: 25,
      titlePrefix: 25,
      titleSubstr: 12,
      specialtyExact: 40,
      specialtySubstr: 18,
      skillExact: 35,
      skillSubstr: 12,
      locationSubstr: 8,
      portfolioSubstr: 10,
    };

    const scoreCoder = (c: Coder, t: string): number => {
      let s = 0;
      const name = (c.displayName || "").toLowerCase();
      if (name === t) s += W.nameExact;
      else if (name.startsWith(t)) s += W.namePrefix;
      else if (name.includes(t)) s += W.nameSubstr;

      const title = (c.title || "").toLowerCase();
      if (title.startsWith(t)) s += W.titlePrefix;
      else if (title.includes(t)) s += W.titleSubstr;

      for (const sp of c.specialties || []) {
        const label = (SPECIALTY_LABELS[sp] || "").toLowerCase();
        if (label === t) s += W.specialtyExact;
        else if (label.includes(t)) s += W.specialtySubstr;
      }

      for (const sk of c.skills || []) {
        const lower = sk.toLowerCase();
        if (lower === t) s += W.skillExact;
        else if (lower.includes(t)) s += W.skillSubstr;
      }

      const loc = (c.location || "").toLowerCase();
      if (loc.includes(t)) s += W.locationSubstr;

      for (const p of c.portfolio || []) {
        if ((p.title || "").toLowerCase().includes(t)) s += W.portfolioSubstr;
      }

      return s;
    };

    const scored: { coder: Coder; score: number }[] = [];
    for (const c of coders) {
      let total = 0;
      let matchedAll = true;
      for (const t of tokens) {
        const tokenScore = scoreCoder(c, t);
        if (tokenScore === 0) {
          matchedAll = false;
          break;
        }
        total += tokenScore;
      }
      if (matchedAll) scored.push({ coder: c, score: total });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.coder);
  }, [coders, searchQuery]);

  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SPECIALTIES.forEach((s) => {
      counts[s] = searchFiltered.filter((c) => (c.specialties || []).includes(s)).length;
    });
    return counts;
  }, [searchFiltered]);

  const filteredCoders = useMemo(() => {
    const list =
      filter === "all"
        ? searchFiltered
        : searchFiltered.filter((c) => (c.specialties || []).includes(filter));
    // When the user is searching, `searchFiltered` is already ordered by
    // relevance score — preserve that. Only re-sort by featured/available
    // when there's no active query.
    if (searchQuery.trim()) return list;
    return [...list].sort((a, b) => {
      const score = (c: Coder) =>
        (c.featured ? 2 : 0) +
        (c.availability === "available" ? 1 : 0) +
        (c.verified ? 0.5 : 0);
      return score(b) - score(a);
    });
  }, [searchFiltered, filter, searchQuery]);

  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden">
      {/* Vetted intro overlay — plays the full check-intro Lottie every
          time the user enters the gallery. The page underneath renders
          and starts fetching immediately, so by the time the animation
          completes the grid usually has data ready to stagger in. */}
      {!introDone && <BrowseIntroOverlay onDone={() => setIntroDone(true)} />}

      <BrowseSidebar
        filter={filter}
        onFilterChange={setFilter}
        counts={specialtyCounts}
      />

      <main
        ref={mainRef}
        className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto"
      >
        <MobileTopBar
          filter={filter}
          onFilterChange={setFilter}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={searchFiltered.length}
          counts={specialtyCounts}
        />

        {/* Sticky desktop header — solid bg, smooth fade-out beneath.
            Mirrors the dashboard pattern (DashboardClient.tsx, settings,
            projects): solid bg-background up top so scrolling content
            is fully masked, then an absolutely-positioned gradient
            sliver underneath that fades the bottom edge into transparent
            so the grid doesn't visually slam into a hard line.
            No backdrop-blur — keeps the page calm and crisp. */}
        <div className="hidden md:block sticky top-0 z-20 bg-background">
          {/* Ticker — full opacity + height when at the top of the page,
              fades + collapses to 0 once the user starts scrolling so
              only the search bar stays locked. The transitions on
              opacity, max-height, and padding all run at the same
              duration so the collapse reads as one motion. */}
          <div
            aria-hidden={scrolled}
            className={`px-4 md:px-12 lg:px-16 overflow-hidden transition-[opacity,max-height,padding] duration-300 ease-out ${
              scrolled
                ? "opacity-0 max-h-0 pt-0 pb-0 pointer-events-none"
                : "opacity-100 max-h-12 pt-4 pb-1"
            }`}
          >
            <BrowseStats coders={filteredCoders} />
          </div>
          <div className="w-full px-4 md:px-12 lg:px-16 pb-5">
            {/* Search spans the full content width — the hairline beneath
                stretches the whole way across, framing the page like a
                masthead rule. */}
            <div className="w-full border-b border-border">
              <BrowseSearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>
          {/* Smooth fade — the strip that hides the abrupt bg edge. */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
        </div>

        <div className="w-full px-4 md:px-12 lg:px-16 pt-5 md:pt-6 pb-10">
          {/* Lightweight tab row — text-only, underline-on-active.
              "Featured" is the resting state; selecting a discipline
              filters the grid in place. */}
          <div className="flex items-center gap-1 mb-10 md:mb-12 -ml-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`relative px-2 py-1 text-[13px] font-medium transition-colors cursor-pointer ${
                filter === "all"
                  ? "text-text-primary after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[1.5px] after:bg-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Featured
            </button>
            <SpecialtyDropdown
              filter={filter}
              onFilterChange={setFilter}
              counts={specialtyCounts}
            />
          </div>

          {/* Grid */}
          <div>
            {fetchError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-[10px]">
                <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-negative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-text-primary mb-1">Failed to load coders</p>
                <p className="text-[11px] text-text-muted mb-3">Something went wrong. Please try again.</p>
                <button
                  onClick={loadCoders}
                  className="px-4 h-8 text-[12px] font-medium text-text-primary border border-border rounded-md hover:border-border-hover active:bg-surface-muted transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              // Center-stage Lottie loader instead of the skeleton grid —
              // the marketplace is the page's protagonist, so the wait
              // gets one calm focal point, not six placeholder cards.
              <BrowseLoadingLottie />
            ) : filteredCoders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-[10px]">
                <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-text-primary mb-1">No matches yet</p>
                <p className="text-[11px] text-text-muted mb-3">Loosen the filters or check back — we vet new coders weekly.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="px-4 h-8 text-[12px] font-medium text-text-primary border border-border rounded-md hover:border-border-hover active:bg-surface-muted transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <LayoutGroup>
                <motion.div layout className="grid gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-10 md:gap-x-8 md:gap-y-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {filteredCoders.map((coder, i) => (
                      <BrowseCoderCard
                        key={coder.id}
                        coder={coder}
                        index={i}
                        onClick={() => setSelectedCoder(coder)}
                        viewerRole={viewerRole}
                        onPrimaryAction={handlePrimaryAction}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>

          {/* Bottom breathing room */}
          <div className="h-12 sm:h-16" />
        </div>
      </main>

      {/* Profile overlay — uses the shared component (DO NOT rewrite) */}
      <CoderProfilePopup coder={selectedCoder} onClose={() => setSelectedCoder(null)} />
    </div>
  );
}
