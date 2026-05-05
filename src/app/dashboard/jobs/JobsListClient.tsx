"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

const statusTone: Record<JobRow["status"], string> = {
  open: "text-positive bg-positive/10",
  closed: "text-negative bg-negative/10",
  filled: "text-text-primary bg-text-primary/10",
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

type StatusFilter = "all" | "open" | "closed" | "filled";

export default function JobsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const s = searchParams.get("status");
    if (s === "open" || s === "closed" || s === "filled") return s;
    return "all";
  });

  useEffect(() => {
    const s = searchParams.get("status");
    setStatusFilter(
      s === "open" || s === "closed" || s === "filled" ? s : "all"
    );
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setJobs(d?.jobs ?? []))
      .catch(() => setError("Couldn't load jobs"));
  }, []);

  const visibleJobs =
    jobs && statusFilter !== "all"
      ? jobs.filter((j) => j.status === statusFilter)
      : jobs;

  return (
    <div className="max-w-3xl h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Jobs</h1>
            <p className="text-[12px] text-text-muted mt-0.5">
              Post a brief and we&apos;ll route vetted creators to your inbox.
            </p>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Post a job
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">
        {/* Status filter pills — also driven by sidebar quick actions
            (?status=open|closed). Reset to All via the same control. */}
        <div className="flex items-center gap-1.5 mb-4">
          {(["all", "open", "closed", "filled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                const url = new URL(window.location.href);
                if (s === "all") url.searchParams.delete("status");
                else url.searchParams.set("status", s);
                router.replace(url.pathname + (url.search || ""));
              }}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer transition-colors capitalize ${
                statusFilter === s
                  ? "bg-[#171717] text-white"
                  : "bg-surface-muted text-text-muted hover:text-text-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className="text-[13px] text-negative">{error}</p>}

        {jobs === null && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-[10px] h-[80px] animate-pulse bg-surface-muted" />
            ))}
          </div>
        )}

        {jobs && jobs.length === 0 && (
          <div className="border border-border rounded-[10px] p-8 text-center">
            <p className="text-[13px] font-medium text-text-primary mb-1">No jobs posted yet</p>
            <p className="text-[12px] text-text-muted mb-4">
              Post a brief to get matched with vetted creators.
            </p>
            <Link
              href="/dashboard/jobs/new"
              className="inline-flex items-center h-9 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium"
            >
              Post your first job
            </Link>
          </div>
        )}

        {visibleJobs && jobs && jobs.length > 0 && visibleJobs.length === 0 && (
          <p className="text-[12px] text-text-muted">
            No {statusFilter} jobs.{" "}
            <button
              onClick={() => {
                setStatusFilter("all");
                const url = new URL(window.location.href);
                url.searchParams.delete("status");
                router.replace(url.pathname);
              }}
              className="underline cursor-pointer hover:text-text-primary"
            >
              Show all
            </button>
          </p>
        )}

        {visibleJobs && visibleJobs.length > 0 && (
          <ul className="space-y-3">
            {visibleJobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/dashboard/jobs/${j.id}`}
                  className="block border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="text-[14px] font-medium text-text-primary truncate">{j.title}</p>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${statusTone[j.status]}`}
                    >
                      {j.status}
                    </span>
                  </div>
                  {j.description && (
                    <p className="text-[12px] text-text-muted line-clamp-2 mb-2">{j.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                    {j.projectType && <span>{j.projectType}</span>}
                    {j.budgetRange && <span>· {j.budgetRange}</span>}
                    {j.timeline && <span>· {j.timeline}</span>}
                    <span className="ml-auto tabular-nums">
                      {j.applicantCount} applicant{j.applicantCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-text-muted mt-1.5">
                    Posted {relativeTime(j.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
