"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";


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

export default function JobApplyClient({ id }: { id: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [applyEligible, setApplyEligible] = useState(false);
  const [existing, setExisting] = useState<ExistingApp | null>(null);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          setError("Couldn't load job");
          return;
        }
        setJob(d.job);
        setApplyEligible(!!d.applyEligible);
        setExisting(d.application ?? null);
      })
      .catch(() => setError("Couldn't load job"));
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
      setError(data?.error || "Couldn't apply");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // Flip into the already-applied state inline so the user keeps the
    // back-to-jobs nav. They can also click through to /dashboard/application
    // from the success banner if they want full status tracking.
    setExisting({ id: "pending", status: "applied" });
    router.refresh();
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-3xl px-4 md:px-8 pt-4 md:pt-6 pb-8">
          <p className="text-[13px] text-negative">{error}</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="w-full max-w-3xl px-4 md:px-8 pt-4 md:pt-6 pb-8">
          <div className="h-6 w-64 bg-surface-muted rounded animate-pulse mb-4" />
          <div className="h-32 bg-surface-muted rounded-[10px] animate-pulse" />
        </div>
      </div>
    );
  }

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
          All jobs
        </Link>

        <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.02em] mb-2">{job.title}</h1>
        <div className="flex items-center gap-3 text-[12px] font-mono text-text-muted mb-6">
          {job.projectType && <span>{job.projectType}</span>}
          {job.budgetRange && <span>· {job.budgetRange}</span>}
          {job.timeline && <span>· {job.timeline}</span>}
        </div>

        {job.description && (
          <section className="border border-border rounded-[10px] p-5 mb-6 bg-background">
            <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </section>
        )}

        {existing ? (
          <div className="border border-positive/30 bg-positive/5 rounded-[10px] p-4 mb-6">
            <p className="text-[13px] font-medium text-text-primary mb-1">You&apos;ve applied to this job</p>
            <p className="text-[12px] text-text-muted">
              Current status: <span className="font-mono uppercase tracking-wider">{existing.status}</span>.
              Track this and other applications in{" "}
              <Link href="/dashboard/application" className="underline underline-offset-2 hover:text-text-primary">
                your application page
              </Link>
              .
            </p>
          </div>
        ) : !applyEligible ? (
          <div className="border border-warning/30 bg-warning/5 rounded-[10px] p-4 mb-6">
            <p className="text-[13px] font-medium text-text-primary mb-1">Verified creators only</p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-3">
              Submit your vetting application first to apply to jobs.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium"
            >
              Continue your application
            </Link>
          </div>
        ) : (
          <section className="border border-border rounded-[10px] p-5">
            <p className="text-[13px] font-medium text-text-primary mb-1">Quick pitch (optional)</p>
            <p className="text-[12px] text-text-muted mb-3">
              Your full profile is sent automatically. Add a short note about why you&apos;re a fit.
            </p>
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="I'd love to work on this because…"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[13px] text-text-primary outline-none focus:border-text-primary resize-none mb-3"
            />
            <button
              onClick={apply}
              disabled={submitting}
              className="w-full h-10 rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Applying…" : "Apply with one click"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
