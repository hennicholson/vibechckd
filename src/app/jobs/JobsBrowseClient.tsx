"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  applied: "text-text-muted bg-surface-muted",
  shortlisted: "text-warning bg-warning/10",
  hired: "text-positive bg-positive/10",
  rejected: "text-negative bg-negative/10",
};

export default function JobsBrowseClient() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [applyEligible, setApplyEligible] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full px-4 md:px-8 pt-4 md:pt-6 pb-8">
        <div className="mb-8">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Job board</p>
          <h1 className="text-[26px] font-semibold text-text-primary tracking-[-0.02em]">Open jobs</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Briefs from vibechckd-vetted clients. Apply with one click — your profile is sent automatically.
          </p>
        </div>

        {!applyEligible && (
          <div className="border border-warning/30 bg-warning/5 rounded-[10px] p-4 mb-6">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Finish your application to unlock applying
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-3">
              Only verified creators can apply to jobs. Submit your full vetting application to get listed in the gallery and start applying.
            </p>
            <Link
              href="/apply"
              className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium"
            >
              Continue your application
            </Link>
          </div>
        )}

        {error && <p className="text-[13px] text-negative mb-4">{error}</p>}

        {jobs === null && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-[10px] h-[100px] animate-pulse bg-surface-muted" />
            ))}
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <div className="border border-border rounded-[10px] p-8 text-center">
            <p className="text-[13px] font-medium text-text-primary mb-1">No open briefs</p>
            <p className="text-[12px] text-text-muted">New ones drop weekly — we&apos;ll ping you.</p>
          </div>
        )}

        {jobs && jobs.length > 0 && (
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="block border border-border rounded-[10px] p-5 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-[14px] font-medium text-text-primary truncate">{j.title}</p>
                    {j.applied && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-positive bg-positive/10 px-2 py-0.5 rounded">
                        Applied
                      </span>
                    )}
                  </div>
                  {j.description && (
                    <p className="text-[12px] text-text-muted line-clamp-2 mb-2">{j.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                    {j.projectType && <span>{j.projectType}</span>}
                    {j.budgetRange && <span>· {j.budgetRange}</span>}
                    {j.timeline && <span>· {j.timeline}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Past + current applications — render only when the creator
            has any history. Includes closed/filled jobs they applied
            to so the page is fully inclusive (open feed + their record
            in one place). Hired/Shortlisted/Not selected badges drive
            the user's read-at-a-glance status. */}
        {myApplications.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-medium text-text-primary">Your applications</h2>
              <span className="text-[11px] font-mono text-text-muted tabular-nums">
                {myApplications.length} total
              </span>
            </div>
            <ul className="space-y-3">
              {myApplications.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/jobs/${a.id}`}
                    className="block border border-border rounded-[10px] p-5 hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-[14px] font-medium text-text-primary truncate">{a.title}</p>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${APP_STATUS_TONE[a.applicationStatus]}`}
                      >
                        {APP_STATUS_LABEL[a.applicationStatus]}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-[12px] text-text-muted line-clamp-2 mb-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                      {a.projectType && <span>{a.projectType}</span>}
                      {a.budgetRange && <span>· {a.budgetRange}</span>}
                      {a.timeline && <span>· {a.timeline}</span>}
                      {a.status !== "open" && (
                        <span className="capitalize">· Job {a.status}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
