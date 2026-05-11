"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useToast, failed } from "@/components/Toast";

interface Job {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
  // Set once the client has started a project from this job; lets us
  // swap "Start project" for an "Open project" link.
  projectId: string | null;
  createdAt: string;
}

interface Applicant {
  applicationId: string;
  creatorId: string;
  creatorName: string | null;
  creatorAvatar: string | null;
  creatorSlug: string | null;
  creatorTagline: string | null;
  creatorRate: string | null;
  creatorSpecialties: string[] | null;
  pitch: string | null;
  status: "applied" | "shortlisted" | "rejected" | "hired";
  createdAt: string;
}

const STATUS_TONE: Record<Applicant["status"], string> = {
  applied: "text-text-secondary bg-surface-muted",
  shortlisted: "text-warning bg-warning/10",
  rejected: "text-negative bg-negative/10",
  hired: "text-white bg-text-primary",
};

const STATUS_LABEL: Record<Applicant["status"], string> = {
  applied: "New",
  shortlisted: "Shortlisted",
  rejected: "Passed",
  hired: "Hired",
};

// Sort applicants by decision urgency: shortlisted first (you flagged
// them, you owe them an answer), then new applications, then everyone
// else. Within each group, newest first.
function sortByDecisionUrgency(a: Applicant, b: Applicant): number {
  const order: Record<Applicant["status"], number> = {
    shortlisted: 0,
    applied: 1,
    hired: 2,
    rejected: 3,
  };
  if (order[a.status] !== order[b.status]) {
    return order[a.status] - order[b.status];
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JobDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [filter, setFilter] = useState<"all" | "shortlisted" | "applied">("all");

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) {
      setError("Couldn't load this brief");
      setLoading(false);
      return;
    }
    const d = await res.json();
    setJob(d.job);
    setApplicants(d.applicants || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const closeJob = async () => {
    if (!window.confirm("Close this brief? Creators won't see it on the open feed anymore — you can still review existing applicants.")) {
      return;
    }
    setClosing(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setClosing(false);
    if (!res.ok) {
      toast(failed("close this brief"), "error");
      return;
    }
    toast("Brief closed — applicants still visible below", "success");
    load();
  };

  // Optimistic status update for an applicant. Reconciled on success
  // via load(); rolls back on failure.
  const mutateApplicantStatus = async (
    appId: string,
    next: Applicant["status"]
  ) => {
    const prev = applicants;
    const target = applicants.find((a) => a.applicationId === appId);
    setApplicants((curr) =>
      curr.map((a) => (a.applicationId === appId ? { ...a, status: next } : a))
    );
    const res = await fetch(`/api/jobs/${id}/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setApplicants(prev);
      toast(failed("update that applicant"), "error");
      return;
    }
    // Decision-specific toast copy — gives the client confidence the
    // creator was notified (the apply route auto-posts to the
    // application conversation; status changes will be picked up in
    // their inbox).
    const name = target?.creatorName || "Creator";
    if (next === "shortlisted") {
      toast(`${name} shortlisted`, "success");
    } else if (next === "rejected") {
      toast(`${name} passed`, "info");
    } else if (next === "hired") {
      toast(`${name} hired — start the project below`, "success");
    }
    // Hiring flips the parent job to "filled" server-side — refetch so the
    // header reflects the new status + the Close button disappears.
    if (next === "hired") load();
  };

  // Spin up a project from this job with all currently-hired applicants
  // attached as members. Idempotent on the server — if a project was
  // already created from this job, the endpoint just returns its id.
  const startProjectFromJob = async () => {
    if (!job) return;
    setCreatingProject(true);
    setProjectError(null);
    const res = await fetch(`/api/jobs/${id}/start-project`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || failed("create the project");
      setProjectError(msg);
      toast(msg, "error");
      setCreatingProject(false);
      return;
    }
    const data = (await res.json()) as { id: string };
    router.push(`/dashboard/projects/${data.id}`);
    router.refresh();
  };

  const sortedApplicants = useMemo(
    () => [...applicants].sort(sortByDecisionUrgency),
    [applicants]
  );

  const filteredApplicants = useMemo(() => {
    if (filter === "all") return sortedApplicants;
    return sortedApplicants.filter((a) => a.status === filter);
  }, [sortedApplicants, filter]);

  const counts = useMemo(() => {
    const base = { all: applicants.length, shortlisted: 0, applied: 0 };
    for (const a of applicants) {
      if (a.status === "shortlisted") base.shortlisted++;
      if (a.status === "applied") base.applied++;
    }
    return base;
  }, [applicants]);

  if (loading) {
    return (
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <div className="h-[14px] w-20 bg-surface-muted rounded animate-pulse mb-4" />
        <div className="h-[28px] w-[60%] bg-surface-muted rounded animate-pulse mb-3" />
        <div className="flex gap-2 mb-6">
          <div className="h-[22px] w-[80px] bg-surface-muted rounded-md animate-pulse" />
          <div className="h-[22px] w-[100px] bg-surface-muted rounded-md animate-pulse" />
        </div>
        <div className="h-[100px] bg-surface-muted rounded-[10px] animate-pulse mb-4" />
        <div className="h-[80px] bg-surface-muted rounded-[10px] animate-pulse" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <Link
          href="/dashboard/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-3"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All jobs
        </Link>
        <div className="border border-border rounded-[10px] p-6 text-center">
          <p className="text-[13px] font-medium text-text-primary">
            {error || "Brief not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <Link
          href="/dashboard/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All jobs
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
              {job.title}
            </h1>
            <p className="text-[11px] font-mono text-text-muted tabular-nums mt-0.5">
              {applicants.length} applicant{applicants.length === 1 ? "" : "s"}
              {counts.applied > 0 && job.status === "open" && (
                <>
                  {" · "}
                  <span className="text-text-primary">
                    {counts.applied} waiting on you
                  </span>
                </>
              )}
            </p>
          </div>
          {job.status === "open" && (
            <button
              onClick={closeJob}
              disabled={closing}
              className="px-3 min-h-[36px] text-[12px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover disabled:opacity-60 transition-colors cursor-pointer flex-shrink-0"
            >
              {closing ? "Closing…" : "Close brief"}
            </button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-2">
        {/* Meta pills — budget + timeline are the buy-signal facts so we
            promote them to chips. */}
        <div className="flex items-center gap-1.5 flex-wrap mb-6">
          {job.projectType && (
            <span className="inline-flex items-center h-[24px] px-2.5 rounded-md bg-surface-muted text-[11px] font-mono text-text-secondary">
              {job.projectType}
            </span>
          )}
          {job.budgetRange && (
            <span className="inline-flex items-center h-[24px] px-2.5 rounded-md bg-positive/10 text-[11px] font-mono text-positive font-medium">
              {job.budgetRange}
            </span>
          )}
          {job.timeline && (
            <span className="inline-flex items-center h-[24px] px-2.5 rounded-md bg-surface-muted text-[11px] font-mono text-text-secondary">
              {job.timeline}
            </span>
          )}
        </div>

        {/* Hire-to-project banner. Two states:
            (a) Project already started for this job → "Open project" link.
            (b) At least one applicant hired but no project yet → "Start project". */}
        {(() => {
          if (job.projectId) {
            return (
              <div className="border border-positive/30 bg-positive/5 rounded-[10px] p-4 mb-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text-primary mb-1">
                      Project running
                    </p>
                    <p className="text-[12px] text-text-muted leading-relaxed">
                      Tasks, deliverables, and chat live there now.
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/projects/${job.projectId}`}
                    className="flex-shrink-0 inline-flex items-center gap-2 min-h-[36px] px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Open project
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          }

          const hired = applicants.filter((a) => a.status === "hired");
          if (hired.length === 0) return null;
          return (
            <div className="border border-positive/30 bg-positive/5 rounded-[10px] p-4 mb-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-primary mb-1">
                    Spin up the project
                  </p>
                  <p className="text-[12px] text-text-muted leading-relaxed">
                    {hired.length} hired —{" "}
                    {hired.map((h) => h.creatorName || "Unnamed").join(", ")}.
                    We&apos;ll attach everyone, seed the workspace with this
                    brief, and open a shared thread.
                  </p>
                </div>
                <button
                  onClick={startProjectFromJob}
                  disabled={creatingProject}
                  className="flex-shrink-0 inline-flex items-center gap-2 min-h-[36px] px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
                >
                  {creatingProject ? "Spinning up…" : "Start project"}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {projectError && (
                <p className="text-[12px] text-negative font-mono mt-2">{projectError}</p>
              )}
            </div>
          );
        })()}

        {job.description && (
          <section className="border border-border rounded-[10px] p-5 mb-6 bg-background">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
              The brief
            </p>
            <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </section>
        )}

        {/* Applicants section — tabs filter the list so the client can
            jump to "who needs me" without scrolling. */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            Applicants
          </p>
          {applicants.length > 0 && (
            <div className="flex items-center gap-1">
              {(["all", "shortlisted", "applied"] as const).map((f) => {
                const active = filter === f;
                const label = f === "all" ? "All" : f === "shortlisted" ? "Shortlist" : "New";
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[11px] font-medium px-2 py-1 min-h-[28px] rounded cursor-pointer transition-colors ${
                      active
                        ? "bg-text-primary text-white"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {label}
                    <span className="ml-1 text-[10px] font-mono tabular-nums opacity-70">
                      {counts[f]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {applicants.length === 0 ? (
          <div className="border border-border rounded-[10px] p-6 text-center">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Nobody&apos;s pulled it yet
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed max-w-[360px] mx-auto">
              Vetted creators can see this brief on their feed. Most apps
              land within 24h of posting.
            </p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="border border-border rounded-[10px] p-6 text-center">
            <p className="text-[12px] text-text-muted mb-2">
              Nothing matches that filter.
            </p>
            <button
              onClick={() => setFilter("all")}
              className="inline-flex items-center min-h-[32px] px-3 rounded-md border border-border text-[12px] font-medium text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Show all
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.ul
              key={filter}
              initial="hidden"
              animate="show"
              variants={containerVariants}
              className="space-y-3"
            >
              {filteredApplicants.map((a) => (
                <motion.li
                  key={a.applicationId}
                  variants={itemVariants}
                  layout
                  className="border border-border rounded-[10px] p-4 bg-background"
                >
                  <div className="flex items-start gap-3">
                    {a.creatorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.creatorAvatar}
                        alt={a.creatorName || "Creator"}
                        className="w-10 h-10 rounded-full object-cover bg-surface-muted flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted flex-shrink-0">
                        {(a.creatorName || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[13px] font-medium text-text-primary truncate">
                          {a.creatorName || "Unnamed"}
                        </p>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${STATUS_TONE[a.status]}`}
                        >
                          {STATUS_LABEL[a.status]}
                        </span>
                      </div>
                      {a.creatorTagline && (
                        <p className="text-[11px] text-text-muted truncate mb-1">
                          {a.creatorTagline}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted mb-2 flex-wrap">
                        {a.creatorRate && <span>{a.creatorRate}</span>}
                        {a.creatorRate && <span>·</span>}
                        <span>Applied {formatDate(a.createdAt)}</span>
                      </div>
                      {a.pitch && (
                        <p className="text-[12px] text-text-secondary leading-relaxed mb-3 whitespace-pre-wrap line-clamp-4">
                          {a.pitch}
                        </p>
                      )}
                      {/* Action row — explicit decision buttons instead
                          of a status dropdown. Mobile-first: each button
                          is min-h-[36px]; on small screens the row wraps. */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {a.creatorSlug && (
                          <Link
                            href={`/coders/${a.creatorSlug}`}
                            className="inline-flex items-center min-h-[32px] px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors"
                          >
                            View profile
                            <svg className="w-2.5 h-2.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                        <div className="ml-auto flex items-center gap-1.5">
                          {a.status !== "rejected" && a.status !== "hired" && (
                            <button
                              onClick={() => mutateApplicantStatus(a.applicationId, "rejected")}
                              className="inline-flex items-center min-h-[32px] px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-negative hover:bg-negative/5 transition-colors cursor-pointer"
                            >
                              Pass
                            </button>
                          )}
                          {a.status !== "shortlisted" && a.status !== "hired" && (
                            <button
                              onClick={() => mutateApplicantStatus(a.applicationId, "shortlisted")}
                              className="inline-flex items-center min-h-[32px] px-2.5 rounded-md text-[11px] font-medium text-warning hover:bg-warning/10 border border-warning/30 transition-colors cursor-pointer"
                            >
                              Shortlist
                            </button>
                          )}
                          {a.status !== "applied" && a.status !== "hired" && (
                            <button
                              onClick={() => mutateApplicantStatus(a.applicationId, "applied")}
                              className="inline-flex items-center min-h-[32px] px-2.5 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                            >
                              Undo
                            </button>
                          )}
                          {a.status !== "hired" && (
                            <button
                              onClick={() => mutateApplicantStatus(a.applicationId, "hired")}
                              className="inline-flex items-center min-h-[32px] px-3 rounded-md text-[11px] font-medium text-white bg-text-primary hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Hire
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
