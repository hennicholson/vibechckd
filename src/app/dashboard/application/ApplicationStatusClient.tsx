"use client";

import Link from "next/link";

type AppStatus = "applied" | "under_review" | "interview" | "approved" | "rejected";

const TIMELINE: { id: AppStatus; label: string; description: string }[] = [
  { id: "applied", label: "Applied", description: "We received your application." },
  { id: "under_review", label: "Under review", description: "A reviewer is going through your portfolio and pitch." },
  { id: "interview", label: "Interview", description: "We'd like to chat. Watch your email." },
  { id: "approved", label: "Approved", description: "You're verified — your profile is live in the gallery." },
];

type JobAppStatus = "applied" | "shortlisted" | "rejected" | "hired";

interface JobApp {
  applicationId: string;
  jobId: string;
  status: JobAppStatus;
  pitch: string | null;
  createdAt: string;
  jobTitle: string;
  jobStatus: "open" | "closed" | "filled";
  jobBudget: string | null;
  jobProjectType: string | null;
}

interface Props {
  application: {
    id: string;
    status: AppStatus;
    reviewerNotes: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
  profileVerified: boolean;
  profileStatus: string | null;
  jobApplications?: JobApp[];
}

const jobAppStatusTone: Record<JobAppStatus, string> = {
  applied: "text-text-secondary bg-surface-muted",
  shortlisted: "text-positive bg-positive/10",
  rejected: "text-negative bg-negative/10",
  hired: "text-white bg-text-primary",
};

export default function ApplicationStatusClient({
  application,
  profileVerified,
  profileStatus,
  jobApplications = [],
}: Props) {
  if (!application) {
    return (
      <main className="h-full overflow-y-auto px-4 md:px-8 pt-6 pb-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Application</p>
            <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em]">You haven&apos;t applied yet</h1>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              Complete the vetting application to unlock your public profile in the gallery.
            </p>
          </div>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-text-primary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Start your application
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <JobApplicationsSection items={jobApplications} />
        </div>
      </main>
    );
  }

  const isRejected = application.status === "rejected";
  const currentIdx = isRejected
    ? -1
    : TIMELINE.findIndex((s) => s.id === application.status);

  return (
    <main className="h-full overflow-y-auto px-4 md:px-8 pt-6 pb-10">
      <div className="max-w-2xl">
        <div className="mb-7">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Application</p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em]">
            {statusHeadline(application.status)}
          </h1>
          <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
            Submitted {formatDate(application.createdAt)}
            {application.reviewedAt && <> · Reviewed {formatDate(application.reviewedAt)}</>}
          </p>
        </div>

        {/* Timeline */}
        {!isRejected ? (
          <ol className="space-y-0 mb-6 border border-border rounded-[10px] bg-background overflow-hidden">
            {TIMELINE.map((step, i) => {
              const state =
                i < currentIdx ? "done" : i === currentIdx ? "current" : "upcoming";
              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 px-4 py-3.5 ${
                    i < TIMELINE.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mt-0.5 ${
                      state === "done"
                        ? "bg-text-primary text-white"
                        : state === "current"
                          ? "bg-text-primary text-white ring-4 ring-text-primary/15"
                          : "border border-border text-text-muted"
                    }`}
                  >
                    {state === "done" ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[13px] font-medium ${
                        state === "upcoming" ? "text-text-muted" : "text-text-primary"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[12px] text-text-muted mt-0.5">{step.description}</p>
                  </div>
                  {state === "current" && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-primary bg-surface-muted px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="border border-border rounded-[10px] p-5 mb-6 bg-background">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Application not approved
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed">
              You can re-apply with an updated portfolio anytime.
            </p>
          </div>
        )}

        {/* Reviewer notes */}
        {application.reviewerNotes && (
          <section className="border border-border rounded-[10px] p-5 mb-6 bg-background">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
              Reviewer notes
            </p>
            <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">
              {application.reviewerNotes}
            </p>
          </section>
        )}

        {/* Profile status when approved */}
        {profileVerified && profileStatus === "active" && (
          <div className="border border-positive/30 bg-positive/5 rounded-[10px] p-4 mb-6">
            <p className="text-[12px] text-positive font-medium">
              Your profile is live and visible in the gallery.
            </p>
            <Link
              href="/dashboard/profile"
              className="text-[12px] text-positive underline mt-1 inline-block"
            >
              Edit your public profile →
            </Link>
          </div>
        )}

        {/* Re-apply CTA on rejection */}
        {isRejected && (
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-text-primary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Re-apply
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        <JobApplicationsSection items={jobApplications} />
      </div>
    </main>
  );
}

function JobApplicationsSection({ items }: { items: JobApp[] }) {
  return (
    <section className="mt-10 pt-8 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[14px] font-medium text-text-primary">Job applications</h2>
        <Link
          href="/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
        >
          Browse jobs →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="border border-border rounded-[10px] p-5 text-center">
          <p className="text-[13px] font-medium text-text-primary mb-1">
            No job applications yet
          </p>
          <p className="text-[12px] text-text-muted mb-3">
            Apply to open jobs from the job board to start filling this list.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
          >
            Browse open jobs
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((j) => (
            <li
              key={j.applicationId}
              className="border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <Link
                  href={`/jobs/${j.jobId}`}
                  className="text-[13px] font-medium text-text-primary truncate hover:underline underline-offset-2"
                >
                  {j.jobTitle}
                </Link>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${jobAppStatusTone[j.status]}`}
                >
                  {j.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted mb-1">
                {j.jobProjectType && <span>{j.jobProjectType}</span>}
                {j.jobBudget && <span>· {j.jobBudget}</span>}
                <span className="ml-auto">
                  Applied {formatDate(j.createdAt)}
                </span>
              </div>
              {j.jobStatus !== "open" && (
                <p className="text-[11px] text-text-muted mt-1">
                  This job is {j.jobStatus}.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-text-muted mt-3 text-center">
        Conversations with the client about each application appear in your{" "}
        <Link href="/dashboard/inbox" className="underline underline-offset-2 hover:text-text-primary">
          inbox
        </Link>
        .
      </p>
    </section>
  );
}

function statusHeadline(s: AppStatus): string {
  switch (s) {
    case "applied":
      return "Application received";
    case "under_review":
      return "Under review";
    case "interview":
      return "Interview stage";
    case "approved":
      return "You're approved";
    case "rejected":
      return "Application closed";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
