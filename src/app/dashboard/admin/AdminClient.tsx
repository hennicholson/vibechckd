"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import VerifiedSeal from "@/components/VerifiedSeal";
import { useToast } from "@/components/Toast";
import { containerVariants, itemVariants } from "@/lib/motion";

// ── Types ──────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "applied"
  | "under_review"
  | "interview"
  | "approved"
  | "rejected";

type Application = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  specialties: string[];
  portfolioLinks: string[];
  sampleProjectUrl: string | null;
  rateExpectation: string;
  pitch: string;
  status: ApplicationStatus;
  reviewerNotes: string | null;
  createdAt: string;
};

type DecisionFilter = "pending" | "approved" | "rejected" | "all";

// ── Helpers ────────────────────────────────────────────────────────────────

const PENDING_STATUSES: ApplicationStatus[] = [
  "applied",
  "under_review",
  "interview",
];

function isPending(status: ApplicationStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

// "How long has this person been waiting?" — surfaces urgency. The
// admin should see at a glance which applications have aged.
function waitingTime(dateStr: string): { label: string; aged: boolean } {
  const submitted = new Date(dateStr).getTime();
  const now = Date.now();
  const hours = Math.floor((now - submitted) / (1000 * 60 * 60));
  if (hours < 1) return { label: "just now", aged: false };
  if (hours < 24) return { label: `${hours}h`, aged: false };
  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `${days}d`, aged: days >= 3 };
  if (days < 30) return { label: `${Math.floor(days / 7)}w`, aged: true };
  return { label: `${Math.floor(days / 30)}mo`, aged: true };
}

function formatSubmitted(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSampleProjectUrls(app: Application): string[] {
  if (!app.sampleProjectUrl) return [];
  return app.sampleProjectUrl.split(",").filter(Boolean);
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

// First image we can find across portfolio + sample URLs — used as the
// row thumbnail in the list. If nothing's available we fall back to
// the avatar initials.
function firstImage(app: Application): string | null {
  const all = [
    ...(app.portfolioLinks || []),
    ...getSampleProjectUrls(app),
  ];
  return all.find((u) => isImageUrl(u)) || null;
}

function statusToStyles(status: ApplicationStatus): {
  pillClasses: string;
  label: string;
} {
  if (status === "approved") {
    return {
      pillClasses: "text-positive bg-positive/10",
      label: "Approved",
    };
  }
  if (status === "rejected") {
    return {
      pillClasses: "text-negative bg-negative/10",
      label: "Rejected",
    };
  }
  if (status === "under_review") {
    return {
      pillClasses: "text-warning bg-warning/10",
      label: "Under review",
    };
  }
  if (status === "interview") {
    return {
      pillClasses: "text-warning bg-warning/10",
      label: "Interview",
    };
  }
  return {
    pillClasses: "text-warning bg-warning/10",
    label: "Pending",
  };
}

// ── Row ────────────────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  onReview,
}: {
  app: Application;
  onReview: (a: Application) => void;
}) {
  const thumb = firstImage(app);
  const wait = waitingTime(app.createdAt);
  const styles = statusToStyles(app.status);

  return (
    <motion.button
      variants={itemVariants}
      onClick={() => onReview(app)}
      className="group w-full text-left bg-background border border-border rounded-[10px] p-3 md:p-4 transition-all hover:border-border-hover hover:-translate-y-px hover:shadow-[0_4px_20px_-12px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:border-text-primary cursor-pointer"
      aria-label={`Review application from ${app.name}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar / portfolio thumb. Square 10px-radius keeps the card
            rhythm; we lean on the avatar fallback when no portfolio
            image is present rather than forcing a grey square. */}
        <div className="flex-shrink-0">
          {thumb ? (
            <div className="relative w-12 h-12 rounded-[10px] overflow-hidden border border-border bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <Avatar alt={app.name} size="md" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row + status pill (right-aligned) */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-[14px] font-medium text-text-primary truncate tracking-[-0.005em]">
                {app.name}
              </h3>
              {app.status === "approved" && <VerifiedSeal size="xs" />}
            </div>
            <span
              className={`flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider ${styles.pillClasses}`}
            >
              {styles.label}
            </span>
          </div>

          {/* Email — secondary, mono */}
          <p className="text-[11.5px] text-text-muted font-mono truncate mb-2">
            {app.email}
          </p>

          {/* Specialty chips + wait-time. Chips are clipped to 4 to keep
              the row scannable; overflow renders a +N pill. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              {(app.specialties || []).slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-mono text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded-md whitespace-nowrap"
                >
                  {s}
                </span>
              ))}
              {(app.specialties || []).length > 4 && (
                <span className="text-[10px] font-mono text-text-muted/70">
                  +{app.specialties.length - 4}
                </span>
              )}
              {(app.specialties || []).length === 0 && (
                <span className="text-[10px] text-text-muted/60 italic">
                  No specialties
                </span>
              )}
            </div>

            {/* Wait time — only meaningful while pending. Approved /
                rejected rows show the decision date instead. */}
            {isPending(app.status) ? (
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums ${
                  wait.aged ? "text-warning" : "text-text-muted"
                }`}
                title={`Submitted ${formatSubmitted(app.createdAt)}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                waiting {wait.label}
              </span>
            ) : (
              <span className="flex-shrink-0 text-[10px] font-mono text-text-muted/70">
                {formatSubmitted(app.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewingApp, setReviewingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");

  // Filters
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("pending");
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("oldest");
  const [searchQuery, setSearchQuery] = useState("");

  // Reject-flow confirmation. Approve is a one-click confirm; reject
  // splits into a two-step "type a reason → confirm" so the creator
  // gets feedback when their application is denied.
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchApplications = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/admin/applications");
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      setFetchError(
        "Couldn't load applications. Check your connection and try again."
      );
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const openReview = (app: Application) => {
    setReviewingApp(app);
    setReviewerNotes(app.reviewerNotes || "");
    setError("");
    setRejectMode(false);
    setRejectReason("");
  };

  const closeReview = () => {
    setReviewingApp(null);
    setError("");
    setReviewerNotes("");
    setRejectMode(false);
    setRejectReason("");
  };

  async function handleStatusUpdate(
    id: string,
    status: "approved" | "rejected",
    notes?: string
  ) {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          reviewerNotes: (notes ?? reviewerNotes).trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
            (status === "approved"
              ? "Couldn't approve. Try again."
              : "Couldn't reject. Try again.")
        );
        setActionLoading(false);
        return;
      }
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: status as ApplicationStatus,
                reviewerNotes: (notes ?? reviewerNotes).trim() || null,
              }
            : a
        )
      );
      toast(
        status === "approved"
          ? `${reviewingApp?.name.split(" ")[0] || "Creator"} verified`
          : "Application rejected",
        "success"
      );
      closeReview();
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => (a.specialties || []).forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [applications]);

  const counts = useMemo(() => {
    return {
      pending: applications.filter((a) => isPending(a.status)).length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      all: applications.length,
    };
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications.slice();

    if (decisionFilter === "pending") list = list.filter((a) => isPending(a.status));
    if (decisionFilter === "approved") list = list.filter((a) => a.status === "approved");
    if (decisionFilter === "rejected") list = list.filter((a) => a.status === "rejected");

    if (specialtyFilter) {
      list = list.filter((a) =>
        (a.specialties || []).includes(specialtyFilter)
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
      return sortBy === "oldest" ? aT - bT : bT - aT;
    });

    return list;
  }, [applications, decisionFilter, specialtyFilter, sortBy, searchQuery]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sticky header — matches projects/inbox shell exactly so the
          dashboard reads as a single design system. */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
                Vetting
              </h1>
              <VerifiedSeal size="sm" />
            </div>
            <p className="text-[11px] font-mono text-text-muted mt-0.5 tabular-nums">
              {counts.pending > 0
                ? `${counts.pending} pending · ${counts.approved} verified`
                : counts.approved > 0
                ? `${counts.approved} verified · all clear`
                : "Nothing in the queue"}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 pt-3">
        {/* Filter rail — decision tabs left, search + sort right. */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-0.5">
            {(
              [
                { key: "pending", label: "Pending", count: counts.pending },
                { key: "approved", label: "Verified", count: counts.approved },
                { key: "rejected", label: "Rejected", count: counts.rejected },
                { key: "all", label: "All", count: counts.all },
              ] as { key: DecisionFilter; label: string; count: number }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDecisionFilter(tab.key)}
                className={`relative px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                  decisionFilter === tab.key
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
                aria-selected={decisionFilter === tab.key}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        decisionFilter === tab.key
                          ? "text-text-muted"
                          : "text-text-muted/70"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
                {decisionFilter === tab.key && (
                  <span className="absolute left-3 right-3 -bottom-px h-[1.5px] bg-text-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-1 min-w-[180px] max-w-[400px]">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applicants…"
                className="w-full text-[13px] text-text-primary placeholder:text-text-muted bg-surface-muted border border-transparent rounded-md pl-9 pr-3 py-2 outline-none focus:border-border-hover transition-colors"
              />
            </div>
            <button
              onClick={() =>
                setSortBy((s) => (s === "oldest" ? "newest" : "oldest"))
              }
              className="flex-shrink-0 text-[11px] font-mono text-text-muted hover:text-text-primary px-2 py-2 rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              title={
                sortBy === "oldest"
                  ? "Showing oldest first (worst wait first)"
                  : "Showing newest first"
              }
            >
              {sortBy === "oldest" ? "Oldest" : "Newest"}
            </button>
          </div>
        </div>

        {/* Specialty filter row — only renders when there's variety to filter
            on. Lets the admin batch-review similar applicants. */}
        {allSpecialties.length > 0 && (
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
            <button
              onClick={() => setSpecialtyFilter(null)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                !specialtyFilter
                  ? "bg-text-primary text-background"
                  : "bg-surface-muted text-text-muted hover:text-text-secondary"
              }`}
            >
              All specialties
            </button>
            {allSpecialties.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setSpecialtyFilter(specialtyFilter === s ? null : s)
                }
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                  specialtyFilter === s
                    ? "bg-text-primary text-background"
                    : "bg-surface-muted text-text-muted hover:text-text-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        <AnimatePresence mode="wait" initial={false}>
          {loading && (
            <motion.div
              key="skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-2"
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[88px] bg-surface-muted rounded-[10px] animate-pulse"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="px-3 py-16 text-center">
            <div className="w-10 h-10 bg-negative/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-negative"
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
            <p className="text-[13px] text-text-secondary mb-4">
              {fetchError}
            </p>
            <Button variant="secondary" size="sm" onClick={fetchApplications}>
              Try again
            </Button>
          </div>
        )}

        {/* Empty state — branched by which filter is active. The
            "well done" message only earns its place when the admin
            is on the pending tab with a clear queue. */}
        {!loading && !fetchError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {decisionFilter === "pending" && counts.pending === 0 ? (
              <>
                <div className="mb-4">
                  <VerifiedSeal size="xl" />
                </div>
                <p className="text-[15px] font-medium text-text-primary mb-1 tracking-[-0.01em]">
                  No pending reviews — well done
                </p>
                <p className="text-[12px] text-text-muted max-w-[320px] leading-relaxed">
                  Every applicant has been decided on. New submissions will
                  land here the moment they arrive.
                </p>
              </>
            ) : searchQuery || specialtyFilter ? (
              <>
                <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-text-muted"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-text-primary mb-1">
                  Nothing matches
                </p>
                <p className="text-[12px] text-text-muted max-w-[320px] leading-relaxed mb-4">
                  Loosen the filters or clear the search to see everything.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSpecialtyFilter(null);
                  }}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-text-muted"
                  >
                    <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[14px] font-medium text-text-primary mb-1">
                  Nothing here yet
                </p>
                <p className="text-[12px] text-text-muted max-w-[320px] leading-relaxed">
                  {decisionFilter === "approved"
                    ? "Approved creators will appear here once you start stamping."
                    : decisionFilter === "rejected"
                    ? "Rejected applications will be listed here for the record."
                    : "Applications will land here when creators apply."}
                </p>
              </>
            )}
          </div>
        )}

        {/* List */}
        {!loading && !fetchError && filtered.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="space-y-2"
          >
            {filtered.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                onReview={openReview}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Review Modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!reviewingApp}
        onClose={closeReview}
        title=""
        size="lg"
      >
        {reviewingApp && (
          <div className="space-y-6">
            {/* Header — applicant identity reads like a profile card,
                not a form heading. The seal appears once they're
                approved so the modal celebrates the decision. */}
            <div className="flex items-start gap-4 pb-5 border-b border-border">
              <div className="flex-shrink-0">
                {(() => {
                  const thumb = firstImage(reviewingApp);
                  if (thumb) {
                    return (
                      <div className="w-14 h-14 rounded-[10px] overflow-hidden border border-border bg-surface-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  }
                  return <Avatar alt={reviewingApp.name} size="lg" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[17px] font-semibold text-text-primary tracking-[-0.01em] truncate">
                    {reviewingApp.name}
                  </h2>
                  {reviewingApp.status === "approved" && (
                    <VerifiedSeal size="sm" />
                  )}
                </div>
                <p className="text-[12px] text-text-muted font-mono truncate mb-2">
                  {reviewingApp.email}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      statusToStyles(reviewingApp.status).pillClasses
                    }`}
                  >
                    {statusToStyles(reviewingApp.status).label}
                  </span>
                  {isPending(reviewingApp.status) && (
                    <span
                      className={`text-[10px] font-mono tabular-nums ${
                        waitingTime(reviewingApp.createdAt).aged
                          ? "text-warning"
                          : "text-text-muted"
                      }`}
                    >
                      waiting {waitingTime(reviewingApp.createdAt).label}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-muted/70">
                    · submitted {formatSubmitted(reviewingApp.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Two-column body on md+: pitch + portfolio left, meta right. */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
              <div className="space-y-5 min-w-0">
                {/* Pitch — biggest content block, leads with the story */}
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                    Pitch
                  </div>
                  <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {reviewingApp.pitch || (
                      <span className="text-text-muted/60 italic">
                        No pitch provided
                      </span>
                    )}
                  </p>
                </div>

                {/* Portfolio links */}
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                    Portfolio
                  </div>
                  {(reviewingApp.portfolioLinks || []).length > 0 ? (
                    <div className="space-y-1">
                      {reviewingApp.portfolioLinks.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-1.5 text-[12.5px] text-text-primary hover:text-text-primary"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-text-muted flex-shrink-0"
                          >
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          <span className="underline underline-offset-2 decoration-border group-hover:decoration-text-primary transition-colors truncate">
                            {link}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-text-muted/70 italic">
                      No portfolio links
                    </p>
                  )}
                </div>

                {/* Work samples — image thumbs render as a tight gallery so
                    the admin can glance and decide rather than clicking
                    into each file. */}
                {(() => {
                  const sampleUrls = getSampleProjectUrls(reviewingApp);
                  if (sampleUrls.length === 0) return null;
                  return (
                    <div>
                      <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                        Work samples
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sampleUrls.map((url) =>
                          isImageUrl(url) ? (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Work sample"
                                className="w-20 h-20 rounded-[10px] object-cover border border-border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ) : (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[12px] text-text-primary font-mono underline underline-offset-2 decoration-border hover:decoration-text-primary transition-colors px-2 py-1 rounded-md bg-surface-muted"
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {url.split("/").pop()?.split("?")[0] || "File"}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Meta sidebar — specialties, rate, prior notes */}
              <div className="space-y-5 md:border-l md:border-border md:pl-6">
                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                    Specialties
                  </div>
                  {(reviewingApp.specialties || []).length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {reviewingApp.specialties.map((s) => (
                        <span
                          key={s}
                          className="text-[11px] font-mono text-text-secondary bg-surface-muted px-2 py-0.5 rounded-md"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-text-muted/70 italic">None</p>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                    Rate
                  </div>
                  <p className="text-[13px] text-text-primary font-mono">
                    {reviewingApp.rateExpectation || (
                      <span className="text-text-muted/60 italic">
                        Not specified
                      </span>
                    )}
                  </p>
                </div>

                {reviewingApp.reviewerNotes && (
                  <div>
                    <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                      Prior notes
                    </div>
                    <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {reviewingApp.reviewerNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Decision flow ───────────────────────────────────────────── */}

            {/* When in reject mode, swap the action bar for a focused
                reason capture. Reason is required — empty submits are
                blocked at the button level. */}
            {rejectMode ? (
              <div className="border-t border-border pt-5 space-y-3">
                <div>
                  <label
                    htmlFor="reject-reason"
                    className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5"
                  >
                    Reason for rejection
                    <span className="text-negative ml-1">*</span>
                  </label>
                  <p className="text-[12px] text-text-muted mb-2">
                    The applicant receives this in their rejection email. Be
                    direct and useful — what would they need to do differently?
                  </p>
                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Portfolio doesn't show the kind of work clients are hiring for. Resubmit once you have 3+ shipped projects we can review."
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted/60 transition-colors focus:outline-none focus:border-text-secondary resize-y min-h-[100px]"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-[12px] text-negative">{error}</p>
                )}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => {
                      setRejectMode(false);
                      setRejectReason("");
                      setError("");
                    }}
                    disabled={actionLoading}
                    className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:pointer-events-none"
                  >
                    ← Back
                  </button>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={closeReview}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() =>
                        handleStatusUpdate(
                          reviewingApp.id,
                          "rejected",
                          rejectReason
                        )
                      }
                      disabled={
                        actionLoading || rejectReason.trim().length < 4
                      }
                      className="!bg-negative hover:!bg-negative/90 !text-white"
                    >
                      {actionLoading ? "Rejecting…" : "Confirm rejection"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-5">
                {/* Optional private notes — only relevant for approve and
                    "decision pending" states. We keep it lean: one
                    expandable input rather than a forced textarea. */}
                <div className="mb-4">
                  <label
                    htmlFor="reviewer-notes"
                    className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5"
                  >
                    Private notes
                    <span className="text-text-muted/60 normal-case ml-1.5 tracking-normal">
                      (optional, internal only)
                    </span>
                  </label>
                  <textarea
                    id="reviewer-notes"
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Anything to flag for future reference…"
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-[13px] text-text-primary placeholder:text-text-muted/60 transition-colors focus:outline-none focus:border-text-secondary resize-y min-h-[60px]"
                  />
                </div>

                {error && (
                  <p className="text-[12px] text-negative mb-3">{error}</p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-text-muted hidden md:block">
                    {reviewingApp.status === "approved"
                      ? "Already approved — re-decide if you need to."
                      : reviewingApp.status === "rejected"
                      ? "Already rejected — re-decide if you need to."
                      : "Approve stamps them as verified. Reject sends feedback."}
                  </p>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setRejectMode(true);
                        setError("");
                      }}
                      disabled={
                        reviewingApp.status === "rejected" || actionLoading
                      }
                      className="!text-negative hover:!border-negative/40"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() =>
                        handleStatusUpdate(reviewingApp.id, "approved")
                      }
                      disabled={
                        reviewingApp.status === "approved" || actionLoading
                      }
                    >
                      {actionLoading
                        ? "Stamping…"
                        : reviewingApp.status === "approved"
                        ? "Approved"
                        : "Approve & stamp"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
