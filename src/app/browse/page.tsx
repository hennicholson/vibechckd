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
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
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
import BrowseFilterPills from "@/components/browse/BrowseFilterPills";
import BrowseStats from "@/components/browse/BrowseStats";
import BrowseCoderCard from "@/components/browse/BrowseCoderCard";

type Filter = "all" | Specialty;
type SortKey = "best" | "rate_asc" | "rate_desc" | "recent";

const SORT_LABELS: Record<SortKey, string> = {
  best: "Best match",
  rate_asc: "Rate (low to high)",
  rate_desc: "Rate (high to low)",
  recent: "Recently added",
};

function parseRate(rate: string): number | null {
  if (!rate) return null;
  const nums = rate.match(/\d+/g);
  if (!nums) return null;
  const parsed = nums.map((n) => parseInt(n, 10)).filter((n) => Number.isFinite(n));
  if (parsed.length === 0) return null;
  if (parsed.length === 1) return parsed[0];
  return Math.round((parsed[0] + parsed[1]) / 2);
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-7 px-2 text-[11px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>Sort:</span>
        <span className="text-text-primary">{SORT_LABELS[value]}</span>
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
            className="absolute right-0 top-full mt-1.5 min-w-[180px] bg-background border border-border rounded-md shadow-[0_6px_24px_-8px_rgba(0,0,0,0.08)] py-1 z-30"
            role="listbox"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <li key={key}>
                <button
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${
                    value === key
                      ? "text-text-primary font-medium bg-surface-muted"
                      : "text-text-secondary hover:bg-background-alt hover:text-text-primary"
                  }`}
                  role="option"
                  aria-selected={value === key}
                >
                  {SORT_LABELS[key]}
                </button>
              </li>
            ))}
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
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              <Link href="/browse" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 rounded-md text-[13px] text-text-primary font-medium bg-surface-muted">
                Browse
              </Link>
              <Link href="/dashboard/teams/new" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 rounded-md text-[13px] text-text-muted hover:text-text-primary">
                Build a Team
              </Link>
              <Link href="/dashboard/projects" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 rounded-md text-[13px] text-text-muted hover:text-text-primary">
                Projects
              </Link>
              <Link href="/dashboard/inbox" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 rounded-md text-[13px] text-text-muted hover:text-text-primary">
                Messages
              </Link>
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted px-2 mb-2">Filter</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { onFilterChange("all"); setDrawerOpen(false); }}
                    className={`h-8 px-2.5 rounded-md text-[11px] font-medium ${filter === "all" ? "bg-text-primary text-white" : "bg-background text-text-primary border border-border"}`}
                  >
                    All · {totalCount}
                  </button>
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => { onFilterChange(s); setDrawerOpen(false); }}
                      className={`h-8 px-2.5 rounded-md text-[11px] font-medium ${filter === s ? "bg-text-primary text-white" : "bg-background text-text-primary border border-border"}`}
                    >
                      {SPECIALTY_LABELS[s]} · {counts[s] ?? 0}
                    </button>
                  ))}
                </div>
              </div>
              {session?.user ? (
                <div className="border-t border-border pt-3 mt-3 space-y-0.5">
                  <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary">Dashboard</Link>
                  <Link href="/dashboard/profile" onClick={() => setDrawerOpen(false)} className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary">Profile</Link>
                  <button
                    onClick={() => { setDrawerOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="block w-full text-left px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="border-t border-border pt-3 mt-3 flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 text-center py-1.5 text-[12px] text-text-primary border border-border rounded-md"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/apply"
                    onClick={() => setDrawerOpen(false)}
                    className="flex-1 text-center py-1.5 text-[12px] font-medium text-white bg-text-primary rounded-md"
                  >
                    Apply
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile search */}
      <div className="px-4 pb-3">
        <BrowseSearchBar value={searchValue} onChange={onSearchChange} />
      </div>
    </div>
  );
}

// ── Skeleton card matching final card dimensions ──
function SkeletonCard() {
  return (
    <div className="rounded-[10px] overflow-hidden border border-border bg-background">
      <div className="aspect-[16/10] bg-surface-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-surface-muted animate-pulse flex-shrink-0" />
          <div className="h-3 bg-surface-muted animate-pulse rounded w-28" />
          <div className="h-3 bg-surface-muted animate-pulse rounded w-14 ml-auto" />
        </div>
        <div className="h-2.5 bg-surface-muted animate-pulse rounded w-40 ml-8" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-surface-muted animate-pulse rounded-md" />
          <div className="h-5 w-16 bg-surface-muted animate-pulse rounded-md" />
          <div className="h-5 w-12 bg-surface-muted animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  const [coders, setCoders] = useState<Coder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("best");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoder, setSelectedCoder] = useState<Coder | null>(null);

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
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return coders;
    const q = searchQuery.toLowerCase();
    return coders.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q) ||
        (c.specialties || []).some((s) => (SPECIALTY_LABELS[s] || "").toLowerCase().includes(q)) ||
        (c.skills || []).some((s) => s.toLowerCase().includes(q)) ||
        (c.portfolio || []).some((p) => (p.title || "").toLowerCase().includes(q))
    );
  }, [coders, searchQuery]);

  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SPECIALTIES.forEach((s) => {
      counts[s] = searchFiltered.filter((c) => (c.specialties || []).includes(s)).length;
    });
    return counts;
  }, [searchFiltered]);

  const filteredCoders = useMemo(() => {
    let list = searchFiltered;
    if (filter !== "all") {
      list = list.filter((c) => (c.specialties || []).includes(filter));
    }
    // Sort
    const sorted = [...list];
    switch (sort) {
      case "rate_asc":
        sorted.sort((a, b) => (parseRate(a.hourlyRate) ?? Infinity) - (parseRate(b.hourlyRate) ?? Infinity));
        break;
      case "rate_desc":
        sorted.sort((a, b) => (parseRate(b.hourlyRate) ?? -Infinity) - (parseRate(a.hourlyRate) ?? -Infinity));
        break;
      case "recent":
        sorted.sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
        break;
      case "best":
      default:
        // featured + available first, then verified, then by name
        sorted.sort((a, b) => {
          const score = (c: Coder) =>
            (c.featured ? 2 : 0) + (c.availability === "available" ? 1 : 0) + (c.verified ? 0.5 : 0);
          return score(b) - score(a);
        });
        break;
    }
    return sorted;
  }, [searchFiltered, filter, sort]);

  return (
    <div className="h-screen bg-background flex md:overflow-hidden">
      <BrowseSidebar
        filter={filter}
        onFilterChange={setFilter}
        counts={specialtyCounts}
      />

      <main className="flex-1 min-w-0 flex flex-col md:h-full md:overflow-y-auto">
        <MobileTopBar
          filter={filter}
          onFilterChange={setFilter}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={searchFiltered.length}
          counts={specialtyCounts}
        />

        <div className="max-w-5xl w-full px-4 md:px-8 pt-4 md:pt-6 pb-6">
          {/* Page header: title + sort */}
          <div className="hidden md:flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.03em]">
                  Browse talent
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
                  <VerifiedSeal size="xs" />
                  Verified
                </span>
              </div>
              <p className="text-[11px] font-mono text-text-muted mt-1 tabular-nums">
                {filteredCoders.length} coder{filteredCoders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {/* Desktop search — hidden on mobile since top bar has its own */}
          <div className="hidden md:block mb-4">
            <BrowseSearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Mobile sort row */}
          <div className="md:hidden flex items-center justify-between mb-3 mt-3">
            <p className="text-[11px] font-mono text-text-muted tabular-nums">
              {filteredCoders.length} coder{filteredCoders.length !== 1 ? "s" : ""}
            </p>
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {/* Filter pills */}
          <div className="mb-4">
            <BrowseFilterPills
              filter={filter}
              onFilterChange={setFilter}
              counts={specialtyCounts}
              totalCount={searchFiltered.length}
            />
          </div>

          {/* Stats */}
          <div className="mb-6">
            <BrowseStats coders={filteredCoders} />
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
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredCoders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-border rounded-[10px]">
                <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-text-primary mb-1">No coders found</p>
                <p className="text-[11px] text-text-muted mb-3">Try adjusting your search or filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="px-4 h-8 text-[12px] font-medium text-text-primary border border-border rounded-md hover:border-border-hover active:bg-surface-muted transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <LayoutGroup>
                <motion.div layout className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {filteredCoders.map((coder, i) => (
                      <BrowseCoderCard
                        key={coder.id}
                        coder={coder}
                        index={i}
                        onClick={() => setSelectedCoder(coder)}
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
