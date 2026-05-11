"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import PageIntroOverlay from "@/components/PageIntroOverlay";
import { usePageIntro } from "@/lib/use-page-intro";

interface JobRow {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
  createdAt: string;
  applied: boolean;
}

interface MyApplication {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
  createdAt: string | null;
  applicationStatus: "applied" | "shortlisted" | "rejected" | "hired";
  appliedAt: string | null;
}

const APP_STATUS_LABEL: Record<MyApplication["applicationStatus"], string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Not selected",
};

const APP_STATUS_TONE: Record<MyApplication["applicationStatus"], string> = {
  applied: "text-text-secondary bg-surface-muted",
  shortlisted: "text-warning bg-warning/10",
  hired: "text-positive bg-positive/10",
  rejected: "text-negative bg-negative/10",
};

const JOB_STATUS_TONE: Record<JobRow["status"], string> = {
  open: "text-positive bg-positive/10",
  closed: "text-text-muted bg-surface-muted",
  filled: "text-text-primary bg-text-primary/10",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
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

type Tab = "open" | "applied";

export default function JobsBrowseClient() {
  const [showIntro, doneIntro] = usePageIntro("intro:jobs");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [applyEligible, setApplyEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "applied" ? "applied" : "open";
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(t === "applied" ? "applied" : "open");
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setJobs(d?.jobs ?? []);
        setMyApplications(d?.myApplications ?? []);
        setApplyEligible(!!d?.applyEligible);
      })
      .catch(() => setError("Couldn't load jobs"));
  }, []);

  const counts = useMemo(
    () => ({ open: jobs?.length ?? 0, applied: myApplications.length }),
    [jobs, myApplications]
  );

  function switchTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    router.replace(url.pathname + url.search);
  }

  return (
    // `relative` anchors the PageIntroOverlay below — the intro
    // sits OVER the page shell while it plays, then fades to reveal
    // the skeleton/data that's already laid out underneath. No cold
    // layout pop when the lottie finishes.
    <div className="w-full h-full flex flex-col relative">
      {/* Intro overlay — only mounts while showIntro is true. Page
          shell renders concurrently so by the time this fades the
          skeleton (or data) is ready. */}
      <AnimatePresence>
        {showIntro && (
          <PageIntroOverlay
            key="jobs-intro"
            lottiePath="/lottie/jobs-intro.json"
            wordmark="JOBS"
            onDone={doneIntro}
          />
        )}
      </AnimatePresence>

      {/* Sticky header — same shell as the rest of the dashboard
          (Portfolio / Earnings / Inbox / Settings) so the title
          left-edge + baseline match when navigating between them. */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
          Job board
        </h1>
        <div className="mt-0.5 h-[16px] flex items-center">
          {jobs === null ? (
            // Subtle pulsing dot trio instead of "Loading…" so the
            // counts line doesn't read as a stuck label during fetch.
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
              {`${counts.open} open · ${counts.applied} applied`}
            </p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-3">
        {/* Lede sentence — gives the page a voice without bloating the
            sticky header. Sits inline with the body so it scrolls away. */}
        <p className="text-[13px] text-text-secondary mb-6 max-w-[560px] leading-relaxed">
          Briefs from vetted clients. Apply with one tap — your profile is sent
          automatically. Track every application + its status here.
        </p>

        {/* Vetting prompt */}
        {!applyEligible && (
          <div className="border border-warning/30 bg-warning/5 rounded-[10px] p-4 mb-6">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Finish your vetting application to start applying
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-3">
              Only verified creators can apply to jobs. Once you're approved, your
              profile is sent automatically with each application.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Continue your application
            </Link>
          </div>
        )}

        {error && <p className="text-[13px] text-negative mb-4">{error}</p>}

        {/* Tabs — text-only with underline-on-active, matching the browse
            page treatment so the visual language stays consistent. */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {(["open", "applied"] as const).map((t) => {
            const active = tab === t;
            const label = t === "open" ? "Open" : "Applied";
            const count = counts[t];
            return (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`relative px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer ${
                  active
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
                aria-selected={active}
              >
                <span>{label}</span>
                <span className="ml-1.5 text-[11px] font-mono text-text-muted tabular-nums">
                  {count}
                </span>
                {active && (
                  <span className="absolute left-3 right-3 -bottom-px h-[1.5px] bg-text-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Loading skeletons — sit behind the intro overlay while it
            plays, then become visible the moment the intro fades.
            Shape matches the real card (title row + description
            lines + meta row) so the layout doesn't jump when data
            replaces them. */}
        {jobs === null && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border border-border rounded-[10px] p-5"
                style={{ opacity: 1 - i * 0.08 }}
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

        {/* Tab content — wrapped in AnimatePresence so switching
            between Open / Applied crossfades instead of jumping. */}
        <AnimatePresence mode="wait" initial={false}>

        {/* Open feed */}
        {jobs !== null && tab === "open" && (
          <motion.div
            key="open-pane"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {jobs.length === 0 ? (
              <div className="border border-border rounded-[10px] p-8 text-center">
                <p className="text-[13px] font-medium text-text-primary mb-1">
                  No open briefs
                </p>
                <p className="text-[12px] text-text-muted mb-4">
                  New ones drop weekly — we&apos;ll ping you when one lands.
                </p>
                {counts.applied > 0 && (
                  <button
                    onClick={() => switchTab("applied")}
                    className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12px] font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    View your {counts.applied} application
                    {counts.applied === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            ) : (
              <motion.ul
                key="open-list"
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="space-y-3"
              >
                {jobs.map((j) => (
                  <motion.li key={j.id} variants={itemVariants}>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="group block border border-border rounded-[10px] p-5 hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-[14px] md:text-[15px] font-medium text-text-primary truncate group-hover:underline underline-offset-4 decoration-from-font">
                          {j.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {j.applied && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-positive bg-positive/10 px-2 py-0.5 rounded">
                              Applied
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${JOB_STATUS_TONE[j.status]}`}
                          >
                            {j.status}
                          </span>
                        </div>
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
                        <span className="ml-auto tabular-nums">
                          Posted {relativeTime(j.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        )}

        {/* Applied feed */}
        {jobs !== null && tab === "applied" && (
          <motion.div
            key="applied-pane"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {myApplications.length === 0 ? (
              <div className="border border-border rounded-[10px] p-8 text-center">
                <p className="text-[13px] font-medium text-text-primary mb-1">
                  No applications out yet
                </p>
                <p className="text-[12px] text-text-muted mb-4">
                  Browse open briefs and apply — every one shows up here so you
                  can track its status at a glance.
                </p>
                <button
                  onClick={() => switchTab("open")}
                  className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Browse open jobs
                </button>
              </div>
            ) : (
              <motion.ul
                key="applied-list"
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="space-y-3"
              >
                {myApplications.map((a) => (
                  <motion.li key={a.id} variants={itemVariants}>
                    <Link
                      href={`/jobs/${a.id}`}
                      className="group block border border-border rounded-[10px] p-5 hover:border-border-hover transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-[14px] md:text-[15px] font-medium text-text-primary truncate group-hover:underline underline-offset-4 decoration-from-font">
                          {a.title}
                        </p>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${APP_STATUS_TONE[a.applicationStatus]}`}
                        >
                          {APP_STATUS_LABEL[a.applicationStatus]}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-[12px] text-text-muted line-clamp-2 mb-2.5">
                          {a.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted flex-wrap">
                        {a.projectType && <span>{a.projectType}</span>}
                        {a.budgetRange && <span>· {a.budgetRange}</span>}
                        {a.timeline && <span>· {a.timeline}</span>}
                        {a.status !== "open" && (
                          <span className="capitalize">· Job {a.status}</span>
                        )}
                        <span className="ml-auto tabular-nums">
                          Applied {relativeTime(a.appliedAt)}
                        </span>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            )}
            {myApplications.length > 0 && (
              <p className="text-[11px] text-text-muted mt-6 text-center">
                Conversations with each client appear in your{" "}
                <Link
                  href="/dashboard/inbox"
                  className="underline underline-offset-2 hover:text-text-primary"
                >
                  inbox
                </Link>
                .
              </p>
            )}
          </motion.div>
        )}

        </AnimatePresence>
      </div>
    </div>
  );
}
