"use client";

import Link from "next/link";

type AppStatus = "applied" | "under_review" | "interview" | "approved" | "rejected";

const TIMELINE: { id: AppStatus; label: string; description: string }[] = [
  { id: "applied", label: "Sent", description: "Your application is in our queue." },
  { id: "under_review", label: "Under review", description: "A reviewer is going through your portfolio and pitch." },
  { id: "interview", label: "Interview", description: "We'd like to chat — keep an eye on your email." },
  { id: "approved", label: "Approved", description: "You're verified. Profile's live in the gallery." },
];

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
}

export default function ApplicationStatusClient({
  application,
  profileVerified,
  profileStatus,
}: Props) {
  // No application row, but the creator profile is already verified (admin
  // vet, migration, etc.) — show the verified state instead of pushing
  // them through the application flow again.
  if (!application && profileVerified) {
    return (
      <main className="h-full overflow-y-auto px-4 md:px-8 pt-6 pb-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Application</p>
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">You&apos;re in</h1>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              Account verified — no application needed.
            </p>
          </div>
          {profileStatus === "active" ? (
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
          ) : (
            <div className="border border-border rounded-[10px] p-4 mb-6 bg-background">
              <p className="text-[12px] text-text-primary font-medium mb-1">
                One last step
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed mb-2">
                Finish your public profile to appear in the gallery.
              </p>
              <Link
                href="/dashboard/profile"
                className="text-[12px] text-text-primary underline"
              >
                Set up your profile →
              </Link>
            </div>
          )}
          <section id="jobs" className="mt-10 pt-8 border-t border-border scroll-mt-24">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[14px] font-medium text-text-primary">Briefs you&apos;ve pulled</h2>
                <p className="text-[12px] text-text-muted mt-0.5">
                  Status of every brief you&apos;ve sent — see it at a glance.
                </p>
              </div>
              <Link
                href="/jobs?tab=applied"
                className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-[12px] font-medium text-text-primary border border-border rounded-md hover:bg-surface-muted transition-colors flex-shrink-0"
              >
                Open job board
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!application) {
    return (
      <main className="h-full overflow-y-auto px-4 md:px-8 pt-6 pb-10">
        <div className="max-w-2xl">
          <div className="mb-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Application</p>
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Ready when you are</h1>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
              Finish vetting to unlock your gallery profile + start pulling
              briefs from clients.
            </p>
          </div>
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-text-primary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Begin the application
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    );
  }

  const isRejected = application.status === "rejected";
  const isApproved = application.status === "approved";
  // When approved we've reached the terminal success state — every step
  // should render as "done", including the Approved row itself. Otherwise
  // the active step is the one matching status.
  const currentIdx = isRejected
    ? -1
    : isApproved
      ? TIMELINE.length
      : TIMELINE.findIndex((s) => s.id === application.status);

  return (
    <main className="h-full overflow-y-auto px-4 md:px-8 pt-6 pb-10">
      <div className="max-w-2xl">
        <div className="mb-7">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1">Application</p>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
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
        {isApproved && profileVerified && profileStatus === "active" && (
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

        {/* Approved but profile not yet active — point them at the next step. */}
        {isApproved && !(profileVerified && profileStatus === "active") && (
          <div className="border border-border rounded-[10px] p-4 mb-6 bg-background">
            <p className="text-[12px] text-text-primary font-medium mb-1">
              One last step
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-2">
              Finish your public profile to appear in the gallery.
            </p>
            <Link
              href="/dashboard/profile"
              className="text-[12px] text-text-primary underline"
            >
              Set up your profile →
            </Link>
          </div>
        )}

        {/* Re-apply CTA on rejection */}
        {isRejected && (
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-lg bg-text-primary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Re-apply with an updated portfolio
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Job applications were here previously — they now live on /jobs
            with proper tabs (Open / Applied) so creators have a single
            inclusive job-board surface. Pointer kept here so anyone
            landing on this page still finds them. */}
        <section id="jobs" className="mt-10 pt-8 border-t border-border scroll-mt-24">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[14px] font-medium text-text-primary">
                Briefs you&apos;ve pulled
              </h2>
              <p className="text-[12px] text-text-muted mt-0.5">
                Different from this — those track client briefs you&apos;ve
                sent your profile to.
              </p>
            </div>
            <Link
              href="/jobs?tab=applied"
              className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-[12px] font-medium text-text-primary border border-border rounded-md hover:bg-surface-muted transition-colors flex-shrink-0"
            >
              Open job board
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function statusHeadline(s: AppStatus): string {
  switch (s) {
    case "applied":
      return "We got it";
    case "under_review":
      return "A reviewer is on it";
    case "interview":
      return "Interview stage — check your email";
    case "approved":
      return "You're in";
    case "rejected":
      return "Not this round";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
