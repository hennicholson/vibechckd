"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Badge from "@/components/Badge";
import Tag from "@/components/Tag";
import Button from "@/components/Button";
import { coders, SPECIALTIES, SPECIALTY_LABELS, type Coder, type PortfolioItem, type Specialty } from "@/lib/mock-data";

// Build a flat list of "work items" — each portfolio piece attributed to its coder
type WorkItem = {
  coder: Coder;
  item: PortfolioItem;
};

function buildWorkItems(coderList: Coder[]): WorkItem[] {
  const items: WorkItem[] = [];
  coderList.forEach((coder) => {
    coder.portfolio.forEach((item) => {
      items.push({ coder, item });
    });
  });
  return items;
}

// Masonry column assignment
function assignColumns(items: WorkItem[], cols: number): WorkItem[][] {
  const columns: WorkItem[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => {
    columns[i % cols].push(item);
  });
  return columns;
}

function OnboardingPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative bg-background border border-border rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-w-[400px] w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#0a0a0a" />
            <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">Welcome to the gallery</span>
        </div>

        <div className="space-y-3 mb-5">
          <p className="text-[13px] text-text-secondary leading-[1.6]">
            Every coder you see here has been through our rigorous vetting process. We review portfolio quality, code standards, design taste, and professional reliability.
          </p>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">1</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Browse work</span> — Click any piece to see the full project, live previews, and creator profile.
            </p>
          </div>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">2</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Filter by specialty</span> — Use the sidebar to narrow by Frontend, Backend, Security, and more.
            </p>
          </div>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">3</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Start a project</span> — Found your match? Initiate directly or build a full team.
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-4 py-2.5 text-[13px] font-medium bg-[#171717] text-[#fafafa] rounded-lg hover:bg-[#0a0a0a] transition-colors cursor-pointer"
        >
          Start browsing
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function BrowsePage() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("vibechckd_onboarding_dismissed");
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCoders = useMemo(() => {
    if (filter === "all") return coders;
    return coders.filter((c) => c.specialties.includes(filter as Specialty));
  }, [filter]);

  // Compute specialty counts from all coders (unfiltered)
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SPECIALTIES.forEach((s) => {
      counts[s] = coders.filter((c) => c.specialties.includes(s)).length;
    });
    return counts;
  }, []);

  const workItems = useMemo(() => buildWorkItems(filteredCoders), [filteredCoders]);

  // Apply search filter
  const searchedItems = useMemo(() => {
    if (!searchQuery.trim()) return workItems;
    const q = searchQuery.toLowerCase();
    return workItems.filter(
      (w) =>
        w.coder.displayName.toLowerCase().includes(q) ||
        w.item.title.toLowerCase().includes(q)
    );
  }, [workItems, searchQuery]);

  const columns = useMemo(() => assignColumns(searchedItems, 3), [searchedItems]);

  // More work from the selected coder (excluding current)
  const moreFromCoder = selectedWork
    ? selectedWork.coder.portfolio
        .filter((p) => p.id !== selectedWork.item.id)
        .slice(0, 4)
    : [];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen">
        <div className="px-4 h-[48px] flex items-center border-b border-border">
          <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
            vibechckd
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#0a0a0a" />
              <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* Nav Links */}
        <div className="px-3 py-3 space-y-0.5">
          <Link href="/browse" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium text-text-primary bg-surface-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Browse
          </Link>
          <Link href="/dashboard/teams/new" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-text-muted hover:text-text-primary hover:bg-background-alt transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Build a Team
          </Link>
        </div>

        {/* Filters */}
        <div className="px-3 mt-4">
          <p className="px-2 text-[11px] font-mono text-text-muted uppercase tracking-[0.06em] mb-2">Filter</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                filter === "all" ? "text-text-primary font-medium bg-surface-muted" : "text-text-muted hover:text-text-primary hover:bg-background-alt"
              }`}
            >
              All work
            </button>
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                  filter === s ? "text-text-primary font-medium bg-surface-muted" : "text-text-muted hover:text-text-primary hover:bg-background-alt"
                }`}
              >
                {SPECIALTY_LABELS[s]} <span className="text-text-muted font-normal">({specialtyCounts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Apply CTA */}
        <div className="mt-auto px-3 py-4 border-t border-border">
          <Link href="/apply">
            <button className="w-full px-3 py-2 text-[12px] font-medium text-text-primary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer">
              Apply to join
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border h-[48px] flex items-center px-4">
          <Link href="/" className="text-[14px] font-semibold text-text-primary">vibechckd</Link>
        </div>

        <div className="flex">
          {/* Masonry Grid */}
          <div className="flex-1 min-w-0 p-4">
            {/* Search */}
            <div className="mb-4 px-1">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by coder or project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-[13px] text-text-primary bg-background border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
                />
              </div>
            </div>

            {/* Verified Header */}
            <motion.div
              className="flex items-center gap-2 mb-5 px-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-[0.1em]">Verified</h1>
              <svg className="w-4 h-4 text-text-primary" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {columns.map((col, colIndex) => (
                <div key={colIndex} className="space-y-4">
                  {col.map((work, i) => (
                    <motion.button
                      key={`${work.coder.id}-${work.item.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      onClick={() => setSelectedWork(selectedWork?.item.id === work.item.id ? null : work)}
                      className={`w-full text-left rounded-[10px] overflow-hidden border transition-colors duration-150 cursor-pointer group ${
                        selectedWork?.item.id === work.item.id
                          ? "border-text-primary"
                          : "border-border hover:border-border-hover"
                      } hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-surface-muted overflow-hidden pfp-static">
                        <img
                          src={work.coder.avatarUrl}
                          alt={work.item.title}
                          className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>

                      {/* Info */}
                      <div className="p-3 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-surface-muted overflow-hidden flex-shrink-0 mt-0.5">
                          <img src={work.coder.avatarUrl} alt={work.coder.displayName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary truncate">{work.item.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[12px] text-text-muted">{work.coder.displayName}</span>
                            {work.coder.verified && <Badge variant="verified" />}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Detail Overlay */}
          <AnimatePresence>
            {selectedWork && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
                onClick={() => setSelectedWork(null)}
              >
                {/* Backdrop */}
                <motion.div
                  className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />

                {/* Modal content */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
                  className="relative bg-background rounded-xl border border-border shadow-[0_24px_80px_rgba(0,0,0,0.15)] w-full max-w-[960px] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Top bar */}
                <div className="sticky top-0 z-10 bg-background border-b border-border h-[48px] flex items-center justify-between px-5">
                  <button
                    onClick={() => setSelectedWork(null)}
                    className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                  <div className="flex gap-2">
                    <Link href={`/coders/${selectedWork.coder.slug}`}>
                      <Button variant="secondary" size="sm">Full profile</Button>
                    </Link>
                    <Button size="sm">Start project</Button>
                  </div>
                </div>

                <div className="max-w-[1100px] mx-auto px-6 py-8">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
                    {/* Left — Media + Project */}
                    <div>
                      {/* Main preview */}
                      {selectedWork.item.assets.filter(a => a.type === "live_preview").length > 0 ? (
                        <div className="border border-border rounded-[10px] overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-border">
                            <div className="flex gap-1.5">
                              <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                              <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                              <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                            </div>
                            <div className="flex-1 mx-2">
                              <div className="bg-background border border-border rounded-md px-2.5 py-1 text-[11px] font-mono text-text-muted truncate">
                                {selectedWork.item.assets.find(a => a.type === "live_preview")?.url}
                              </div>
                            </div>
                            <a
                              href={selectedWork.item.assets.find(a => a.type === "live_preview")?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-muted hover:text-text-primary transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                          <iframe
                            src={selectedWork.item.assets.find(a => a.type === "live_preview")?.url}
                            className="w-full h-[480px] bg-white"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video rounded-[10px] overflow-hidden border border-border pfp-static">
                          <img src={selectedWork.coder.avatarUrl} alt={selectedWork.item.title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Project info below media */}
                      <div className="mt-5">
                        <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em]">
                          {SPECIALTY_LABELS[selectedWork.coder.specialties[0]]} &middot; Project
                        </p>
                        <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.03em] mt-1">
                          {selectedWork.item.title}
                        </h1>
                        <p className="text-[14px] text-text-secondary mt-3 leading-[1.6] max-w-[600px]">
                          {selectedWork.item.description}
                        </p>
                      </div>

                      {/* Other assets */}
                      {selectedWork.item.assets.filter(a => a.type !== "live_preview").length > 0 && (
                        <div className="mt-6">
                          <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em] mb-3">Project assets</p>
                          <div className="border border-border rounded-[10px] overflow-hidden">
                            {selectedWork.item.assets.filter(a => a.type !== "live_preview").map((asset, i, arr) => (
                              <a
                                key={asset.id}
                                href={asset.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 px-4 py-3 hover:bg-background-alt transition-colors ${
                                  i < arr.length - 1 ? "border-b border-border" : ""
                                }`}
                              >
                                <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-text-primary">{asset.title}</p>
                                  <p className="text-[11px] text-text-muted font-mono">{asset.type.replace("_", " ")}</p>
                                </div>
                                <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right — Creator info */}
                    <div>
                      <div className="sticky top-[64px]">
                        {/* Creator card */}
                        <div className="border border-border rounded-[10px] p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[8px] overflow-hidden bg-surface-muted pfp-static">
                              <img src={selectedWork.coder.avatarUrl} alt={selectedWork.coder.displayName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-text-primary">{selectedWork.coder.displayName}</span>
                                {selectedWork.coder.verified && <Badge variant="verified" size="md" />}
                              </div>
                              <span className="text-[12px] text-text-muted">{selectedWork.coder.hourlyRate}</span>
                            </div>
                          </div>

                          <p className="text-[13px] text-text-secondary mt-4 leading-[1.55]">
                            {selectedWork.coder.bio}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-4">
                            {selectedWork.coder.skills.map((skill) => (
                              <Tag key={skill}>{skill}</Tag>
                            ))}
                          </div>

                          <p className="text-[12px] text-text-muted mt-3">
                            {selectedWork.coder.location}
                          </p>

                          {/* Social */}
                          <div className="flex gap-2 mt-3">
                            {selectedWork.coder.githubUrl && (
                              <a href={selectedWork.coder.githubUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                              </a>
                            )}
                            {selectedWork.coder.twitterUrl && (
                              <a href={selectedWork.coder.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                              </a>
                            )}
                            {selectedWork.coder.websiteUrl && (
                              <a href={selectedWork.coder.websiteUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>

                          <div className="flex gap-2 mt-5">
                            <Button className="flex-1">Start project</Button>
                            <Button variant="secondary" className="flex-1">Send inquiry</Button>
                          </div>
                        </div>

                        {/* More from this creator */}
                        {moreFromCoder.length > 0 && (
                          <div className="mt-5">
                            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em] mb-3">
                              More from {selectedWork.coder.displayName}
                            </p>
                            <div className="border border-border rounded-[10px] overflow-hidden">
                              {moreFromCoder.map((item, i) => (
                                <button
                                  key={item.id}
                                  onClick={() => setSelectedWork({ coder: selectedWork.coder, item })}
                                  className={`w-full text-left flex items-center gap-3 p-3 hover:bg-background-alt transition-colors cursor-pointer ${
                                    i < moreFromCoder.length - 1 ? "border-b border-border" : ""
                                  }`}
                                >
                                  <div className="w-12 h-12 rounded-md bg-surface-muted overflow-hidden flex-shrink-0">
                                    <img src={selectedWork.coder.avatarUrl} alt={item.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.title}</p>
                                    <p className="text-[11px] text-text-muted">{selectedWork.coder.displayName}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Onboarding popup */}
      <AnimatePresence>
        {showOnboarding && <OnboardingPopup onDismiss={() => { setShowOnboarding(false); sessionStorage.setItem("vibechckd_onboarding_dismissed", "1"); }} />}
      </AnimatePresence>
    </div>
  );
}
