"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useToast, failed } from "@/components/Toast";

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
  createdAt: string;
  applicantCount: number;
}

const STATUS_TONE: Record<JobRow["status"], string> = {
  open: "text-positive bg-positive/10",
  closed: "text-text-muted bg-surface-muted",
  filled: "text-text-primary bg-text-primary/10",
};

const STATUS_LABEL: Record<JobRow["status"], string> = {
  open: "Open",
  closed: "Closed",
  filled: "Hired",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type Tab = "open" | "closed" | "filled" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "filled", label: "Hired" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

export default function JobsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const s = searchParams.get("status");
    if (s === "open" || s === "closed" || s === "filled") return s;
    return "open";
  });

  useEffect(() => {
    const s = searchParams.get("status");
    setTab(
      s === "open" || s === "closed" || s === "filled" ? s : "open"
    );
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setJobs(d?.jobs ?? []))
      .catch(() => {
        const msg = failed("load your jobs");
        setError(msg);
        toast(msg, "error");
      });
  }, [toast]);

  // Counts roll up the full job list — the tab badges should reflect
  // the total, not whatever the current filter is. Memoized so we
  // don't recompute on every render.
  const counts = useMemo(() => {
    const base = { open: 0, closed: 0, filled: 0, all: 0 };
    if (!jobs) return base;
    base.all = jobs.length;
    for (const j of jobs) base[j.status]++;
    return base;
  }, [jobs]);

  const visibleJobs =
    jobs && tab !== "all" ? jobs.filter((j) => j.status === tab) : jobs;

  // Aggregate applicant counts across visible jobs — surfaces "you have
  // 7 people waiting on you" in the sticky header so the client knows
  // there's stuff to decide on.
  const pendingApplicants = useMemo(() => {
    if (!jobs) return 0;
    return jobs
      .filter((j) => j.status === "open")
      .reduce((sum, j) => sum + j.applicantCount, 0);
  }, [jobs]);

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "open") url.searchParams.delete("status");
    else url.searchParams.set("status", next);
    router.replace(url.pathname + (url.search || ""));
  }

  return (
    <div className="max-w-3xl h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
              Your jobs
            </h1>
            <div className="mt-0.5 h-[16px] flex items-center">
              {jobs === null ? (
                <div className="flex items-center gap-1" aria-label="Loading">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-text-muted animate-pulse"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-mono text-text-muted tabular-nums">
                  {counts.open} open
                  {pendingApplicants > 0 && (
                    <>
                      {" · "}
                      <span className="text-text-primary">
                        {pendingApplicants} waiting on you
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-2 min-h-[36px] px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity flex-shrink-0"
          >
            Post a brief
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-3">
        {/* Lede — sets expectations, mirrors creator side voice. */}
        <p className="text-[13px] text-text-secondary mb-6 max-w-[560px] leading-relaxed">
          Post a brief and we&apos;ll route vetted creators straight to your
          inbox. Decide who&apos;s a fit here — shortlist, pass, or hire.
        </p>

        {/* Tabs — text-only with underline-on-active, matching the
            creator-side /jobs treatment. Pulls double duty as status
            filter and is driven by ?status= for sidebar deep-links. */}
        <div className="flex items-center gap-1 mb-6 border-b border-border overflow-x-auto -mx-1 px-1 scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`relative px-3 py-2 min-h-[40px] text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
                aria-selected={active}
              >
                <span>{t.label}</span>
                <span className="ml-1.5 text-[11px] font-mono text-text-muted tabular-nums">
                  {counts[t.key]}
                </span>
                {active && (
                  <span className="absolute left-3 right-3 -bottom-px h-[1.5px] bg-text-primary" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-[13px] text-negative mb-4 font-mono">{error}</p>
        )}

        {/* Loading skeleton mirrors real card shape. */}
        {jobs === null && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-border rounded-[10px] p-4"
                style={{ opacity: 1 - i * 0.1 }}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="h-[14px] w-[55%] rounded bg-surface-muted animate-pulse" />
                  <div className="h-[16px] w-[52px] rounded bg-surface-muted animate-pulse" />
                </div>
                <div className="h-[10px] w-[90%] rounded bg-surface-muted animate-pulse mb-1.5" />
                <div className="h-[10px] w-[70%] rounded bg-surface-muted animate-pulse mb-3" />
                <div className="flex items-center gap-3">
                  <div className="h-[10px] w-[64px] rounded bg-surface-muted animate-pulse" />
                  <div className="h-[10px] w-[80px] rounded bg-surface-muted animate-pulse" />
                  <div className="h-[10px] w-[72px] rounded bg-surface-muted animate-pulse ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {jobs !== null && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {jobs.length === 0 ? (
                <div className="border border-border rounded-[10px] p-8 text-center">
                  <p className="text-[13px] font-medium text-text-primary mb-1">
                    Nothing posted yet
                  </p>
                  <p className="text-[12px] text-text-muted mb-4 max-w-[360px] mx-auto leading-relaxed">
                    Drop a brief — we&apos;ll route vetted creators to your
                    inbox, usually within hours.
                  </p>
                  <Link
                    href="/dashboard/jobs/new"
                    className="inline-flex items-center min-h-[40px] px-4 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                  >
                    Post your first brief
                  </Link>
                </div>
              ) : visibleJobs && visibleJobs.length === 0 ? (
                <div className="border border-border rounded-[10px] p-6 text-center">
                  <p className="text-[12px] text-text-muted mb-2">
                    No {tab} jobs in your stack.
                  </p>
                  <button
                    onClick={() => switchTab("all")}
                    className="inline-flex items-center min-h-[32px] px-3 rounded-md border border-border text-[12px] font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Show all
                  </button>
                </div>
              ) : (
                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={containerVariants}
                  className="space-y-3"
                >
                  {visibleJobs!.map((j) => {
                    // Decision priority: open jobs with applicants need
                    // action; surface the count in a stronger color.
                    const needsReview = j.status === "open" && j.applicantCount > 0;
                    return (
                      <motion.li key={j.id} variants={itemVariants}>
                        <Link
                          href={`/dashboard/jobs/${j.id}`}
                          className="group block border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="text-[14px] md:text-[15px] font-medium text-text-primary truncate group-hover:underline underline-offset-4 decoration-from-font">
                              {j.title}
                            </p>
                            <span
                              className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${STATUS_TONE[j.status]}`}
                            >
                              {STATUS_LABEL[j.status]}
                            </span>
                          </div>
                          {j.description && (
                            <p className="text-[12px] text-text-muted line-clamp-2 mb-2.5">
                              {j.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted flex-wrap">
                            {j.projectType && <span>{j.projectType}</span>}
                            {j.budgetRange && <span>· {j.budgetRange}</span>}
                            {j.timeline && <span>· {j.timeline}</span>}
                            <span
                              className={`ml-auto tabular-nums ${
                                needsReview
                                  ? "text-text-primary font-medium"
                                  : ""
                              }`}
                            >
                              {j.applicantCount} applicant
                              {j.applicantCount === 1 ? "" : "s"}
                              {needsReview && " · review"}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-text-muted mt-1.5">
                            Posted {relativeTime(j.createdAt)}
                          </p>
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
