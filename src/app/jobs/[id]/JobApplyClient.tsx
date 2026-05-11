"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sectionVariants } from "@/lib/motion";
import { useToast, failed } from "@/components/Toast";


interface JobDetail {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
}

interface ExistingApp {
  id: string;
  status: "applied" | "shortlisted" | "rejected" | "hired";
}

// Copy that maps each application status to a status banner. Avoids
// corporate ATS phrasing — every line should sound like a teammate
// reading their inbox out loud.
const STATUS_COPY: Record<
  ExistingApp["status"],
  { label: string; headline: string; body: string; tone: "positive" | "warning" | "muted" | "negative" }
> = {
  applied: {
    label: "Sent",
    headline: "Your profile is in",
    body: "We pushed it to the client. They'll reach out via your inbox if there's a match.",
    tone: "positive",
  },
  shortlisted: {
    label: "Shortlisted",
    headline: "Shortlisted — they want a call",
    body: "The client flagged you. Check your inbox for next steps.",
    tone: "warning",
  },
  hired: {
    label: "Hired",
    headline: "You got it — head to your project",
    body: "Your project workspace is live. Tasks, deliverables, and chat are waiting.",
    tone: "positive",
  },
  rejected: {
    label: "Passed",
    headline: "Not this one",
    body: "They went a different direction. Plenty more briefs landing weekly.",
    tone: "negative",
  },
};

export default function JobApplyClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [applyEligible, setApplyEligible] = useState(false);
  const [existing, setExisting] = useState<ExistingApp | null>(null);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          setError("Couldn't load this brief — try again in a sec.");
          return;
        }
        setJob(d.job);
        setApplyEligible(!!d.applyEligible);
        setExisting(d.application ?? null);
      })
      .catch(() => setError("Couldn't load this brief — try again in a sec."));
  }, [id]);

  async function apply() {
    if (!applyEligible) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/jobs/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitch: pitch || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || failed("send your profile");
      setError(msg);
      toast(msg, "error");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // Flip into the already-applied state inline so the user keeps the
    // back-to-jobs nav. They can also click through to /jobs?tab=applied
    // from the success banner if they want full status tracking.
    setExisting({ id: "pending", status: "applied" });
    toast("Profile sent — the client has it now", "success");
    router.refresh();
  }

  async function withdraw() {
    if (!existing) return;
    const ok = window.confirm(
      "Pull your profile from this brief? You can re-send it later if you change your mind."
    );
    if (!ok) return;
    setWithdrawing(true);
    const res = await fetch(`/api/jobs/${id}/apply`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || failed("pull your application");
      toast(msg, "error");
      setWithdrawing(false);
      return;
    }
    setExisting(null);
    setPitch("");
    toast("Pulled — back in the open feed", "success");
    setWithdrawing(false);
    router.refresh();
  }

  if (error && !job) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-3xl px-4 md:px-8 pt-4 md:pt-6 pb-8">
          <Link
            href="/jobs"
            className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-3"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All briefs
          </Link>
          <div className="border border-border rounded-[10px] p-6 text-center">
            <p className="text-[13px] font-medium text-text-primary mb-1">Couldn&apos;t load this brief</p>
            <p className="text-[12px] text-text-muted">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-3xl px-4 md:px-8 pt-4 md:pt-6 pb-8">
          {/* Skeleton mirrors the real layout so nothing pops when data
              lands — title → meta row → description card → apply card. */}
          <div className="h-[14px] w-20 bg-surface-muted rounded animate-pulse mb-4" />
          <div className="h-[28px] w-[70%] bg-surface-muted rounded animate-pulse mb-3" />
          <div className="flex gap-2 mb-6">
            <div className="h-[24px] w-[80px] bg-surface-muted rounded-md animate-pulse" />
            <div className="h-[24px] w-[100px] bg-surface-muted rounded-md animate-pulse" />
            <div className="h-[24px] w-[90px] bg-surface-muted rounded-md animate-pulse" />
          </div>
          <div className="h-[120px] bg-surface-muted rounded-[10px] animate-pulse mb-6" />
          <div className="h-[180px] bg-surface-muted rounded-[10px] animate-pulse" />
        </div>
      </div>
    );
  }

  const statusInfo = existing ? STATUS_COPY[existing.status] : null;
  const toneClass = statusInfo
    ? statusInfo.tone === "positive"
      ? "border-positive/30 bg-positive/5"
      : statusInfo.tone === "warning"
        ? "border-warning/30 bg-warning/5"
        : statusInfo.tone === "negative"
          ? "border-negative/30 bg-negative/5"
          : "border-border bg-surface-muted/30"
    : "";

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full max-w-3xl px-4 md:px-8 pt-4 md:pt-6 pb-12">
        <Link
          href="/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-3 min-h-[24px]"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All briefs
        </Link>

        <motion.div initial="hidden" animate="show" variants={sectionVariants}>
          <h1 className="text-[22px] md:text-[24px] font-semibold text-text-primary tracking-[-0.02em] mb-3 leading-tight">
            {job.title}
          </h1>

          {/* Meta pills — budget + timeline are the buy-signal facts so we
              promote them to chips (vs. inline mono text) and put them on
              their own line where they read instantly. */}
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
            {job.status !== "open" && (
              <span className="inline-flex items-center h-[24px] px-2.5 rounded-md bg-text-primary/10 text-[11px] font-mono uppercase tracking-wider text-text-primary">
                {job.status}
              </span>
            )}
          </div>
        </motion.div>

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

        {existing && statusInfo ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`border rounded-[10px] p-4 md:p-5 mb-6 ${toneClass}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <p className="text-[13px] font-medium text-text-primary">
                    {statusInfo.headline}
                  </p>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    {statusInfo.label}
                  </span>
                </div>
                <p className="text-[12px] text-text-muted leading-relaxed mb-3">
                  {statusInfo.body}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href="/jobs?tab=applied"
                    className="inline-flex items-center min-h-[32px] px-3 rounded-md border border-border text-[12px] font-medium text-text-primary hover:bg-surface-muted transition-colors"
                  >
                    See all your applications
                  </Link>
                  {existing.status === "shortlisted" || existing.status === "hired" ? (
                    <Link
                      href="/dashboard/inbox"
                      className="inline-flex items-center min-h-[32px] px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                    >
                      Open inbox
                      <svg className="w-3 h-3 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : null}
                  {existing.status === "applied" && (
                    <button
                      onClick={withdraw}
                      disabled={withdrawing}
                      className="inline-flex items-center min-h-[32px] px-3 rounded-md text-[12px] font-medium text-text-muted hover:text-text-primary disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {withdrawing ? "Pulling…" : "Pull this back"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : !applyEligible ? (
          <div className="border border-warning/30 bg-warning/5 rounded-[10px] p-4 md:p-5 mb-6">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Verified creators only
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-3">
              Finish your vetting application — once you&apos;re in, your
              profile gets sent automatically with every brief you pull.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center min-h-[36px] px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Continue your application
            </Link>
          </div>
        ) : job.status !== "open" ? (
          <div className="border border-border rounded-[10px] p-4 md:p-5 mb-6 bg-surface-muted/30">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              This brief is closed
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed">
              The client isn&apos;t taking new applications. New briefs land weekly.
            </p>
          </div>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="border border-border rounded-[10px] p-5 bg-background"
          >
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Pull this brief
            </p>
            <p className="text-[12px] text-text-muted mb-3 leading-relaxed">
              Your full profile goes with it. Drop a line about why this
              one&apos;s a fit (optional, but it helps).
            </p>
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="I'd be a fit because…"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[16px] md:text-[13px] text-text-primary outline-none focus:border-text-primary resize-none mb-1"
            />
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-text-muted">
                Reversible until they review it
              </p>
              <p className="text-[10px] font-mono text-text-muted tabular-nums">
                {pitch.length}/2000
              </p>
            </div>
            {error && (
              <p className="text-[12px] text-negative font-mono mb-3">{error}</p>
            )}
            <button
              onClick={apply}
              disabled={submitting}
              className="w-full min-h-[44px] rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {submitting ? "Sending your profile…" : "Send your profile"}
            </button>
          </motion.section>
        )}
      </div>
    </div>
  );
}
