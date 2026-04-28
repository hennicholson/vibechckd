"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  status: "open" | "closed" | "filled";
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

const statusTone: Record<Applicant["status"], string> = {
  applied: "text-text-secondary bg-surface-muted",
  shortlisted: "text-positive bg-positive/10",
  rejected: "text-negative bg-negative/10",
  hired: "text-white bg-text-primary",
};

export default function JobDetailClient({ id }: { id: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) {
      setError("Couldn't load job");
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
  }, [id]);

  const closeJob = async () => {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    load();
  };

  if (loading) {
    return (
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <div className="h-6 w-64 bg-surface-muted rounded animate-pulse mb-4" />
        <div className="h-24 bg-surface-muted rounded-[10px] animate-pulse" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <p className="text-[13px] text-negative">{error || "Job not found"}</p>
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
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] truncate">
              {job.title}
            </h1>
            <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted mt-1">
              {job.projectType && <span>{job.projectType}</span>}
              {job.budgetRange && <span>· {job.budgetRange}</span>}
              {job.timeline && <span>· {job.timeline}</span>}
            </div>
          </div>
          {job.status === "open" && (
            <button
              onClick={closeJob}
              className="px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer"
            >
              Close job
            </button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">
        {job.description && (
          <section className="border border-border rounded-[10px] p-5 mb-6 bg-background">
            <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </section>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            Applicants ({applicants.length})
          </p>
        </div>

        {applicants.length === 0 ? (
          <div className="border border-border rounded-[10px] p-6 text-center">
            <p className="text-[13px] font-medium text-text-primary mb-1">No applicants yet</p>
            <p className="text-[12px] text-text-muted">
              Vetted creators can see this job in their job board. Hang tight.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {applicants.map((a) => (
              <li
                key={a.applicationId}
                className="border border-border rounded-[10px] p-4"
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
                        className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${statusTone[a.status]}`}
                      >
                        {a.status}
                      </span>
                    </div>
                    {a.creatorTagline && (
                      <p className="text-[11px] text-text-muted truncate mb-1">{a.creatorTagline}</p>
                    )}
                    {a.pitch && (
                      <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed line-clamp-3">
                        {a.pitch}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      {a.creatorSlug && (
                        <Link
                          href={`/coders/${a.creatorSlug}`}
                          className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors underline underline-offset-2"
                        >
                          View profile
                        </Link>
                      )}
                      {a.creatorRate && (
                        <span className="text-[11px] font-mono text-text-muted">· {a.creatorRate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
