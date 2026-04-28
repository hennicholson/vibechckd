"use client";

import { useState, useEffect } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

// ── Types ──

type ApplicationStatus = "applied" | "under_review" | "interview" | "approved" | "rejected";

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

// ── Status helpers ──

function statusToBadgeVariant(status: ApplicationStatus): "pending" | "approved" | "rejected" {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function statusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    applied: "Applied",
    under_review: "Under Review",
    interview: "Interview",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getSampleProjectUrls(app: Application): string[] {
  if (!app.sampleProjectUrl) return [];
  return app.sampleProjectUrl.split(",").filter(Boolean);
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

// ── Component ──

export default function AdminPage() {
  const [tab, setTab] = useState<"applications">("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewingApp, setReviewingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");

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
      setFetchError("Failed to load applications. Please check your connection and try again.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // When opening a review modal, initialize reviewer notes from the application
  const openReview = (app: Application) => {
    setReviewingApp(app);
    setReviewerNotes(app.reviewerNotes || "");
    setError("");
  };

  async function handleStatusUpdate(id: string, status: "approved" | "rejected") {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, reviewerNotes: reviewerNotes.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${status === "approved" ? "approve" : "reject"} application`);
        setActionLoading(false);
        return;
      }
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: status as ApplicationStatus, reviewerNotes: reviewerNotes.trim() || null }
            : a
        )
      );
      setReviewingApp(null);
      setReviewerNotes("");
    } catch {
      setError(`Failed to update application. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-[960px] h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-[20px] font-semibold text-text-primary">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border">
          <button
            onClick={() => setTab("applications")}
            className={`pb-2.5 text-[13px] font-medium transition-colors cursor-pointer ${
              tab === "applications"
                ? "text-text-primary border-b-[2px] border-text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Applications
            {!loading && !fetchError && (
              <span className="ml-1.5 text-[11px] font-mono text-text-muted">
                {applications.filter((a) => a.status !== "approved" && a.status !== "rejected").length}
              </span>
            )}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {/* Loading state */}
      {loading && (
        <div className="px-3 py-12 text-center text-[13px] text-text-muted">
          Loading applications...
        </div>
      )}

      {/* Error state with retry */}
      {!loading && fetchError && (
        <div className="px-3 py-12 text-center">
          <div className="w-10 h-10 bg-surface-muted rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-negative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-[13px] text-text-secondary mb-4">{fetchError}</p>
          <Button variant="secondary" size="sm" onClick={fetchApplications}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !fetchError && applications.length === 0 && (
        <div className="px-3 py-12 text-center">
          <div className="w-10 h-10 bg-surface-muted rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">No applications</p>
          <p className="text-[13px] text-text-muted">Applications will appear here when creators apply.</p>
        </div>
      )}

      {/* Applications Tab */}
      {!loading && !fetchError && applications.length > 0 && tab === "applications" && (
        <div className="space-y-0 overflow-x-auto">
          {/* Table header -- hidden on mobile, cards used instead */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_100px_80px_80px] gap-3 px-3 py-2 text-[11px] font-mono text-text-muted uppercase tracking-wide">
            <span>Name</span>
            <span>Email</span>
            <span>Specialties</span>
            <span>Submitted</span>
            <span>Status</span>
            <span></span>
          </div>
          {applications.map((app) => (
            <div
              key={app.id}
              className="hidden md:grid grid-cols-[1fr_1fr_1fr_100px_80px_80px] gap-3 items-center px-3 py-3 border-t border-border"
            >
              <span className="text-[13px] text-text-primary font-medium truncate">{app.name}</span>
              <span className="text-[12px] text-text-muted font-mono truncate">{app.email}</span>
              <div className="flex gap-1.5 flex-wrap">
                {(app.specialties || []).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 text-[11px] font-mono text-text-secondary bg-surface-muted rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <span className="text-[12px] text-text-muted">{formatDate(app.createdAt)}</span>
              <Badge variant={statusToBadgeVariant(app.status)} />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openReview(app)}
              >
                Review
              </Button>
            </div>
          ))}
          {/* Mobile card layout */}
          {applications.map((app) => (
            <div
              key={`mobile-${app.id}`}
              className="md:hidden border-t border-border px-3 py-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-primary font-medium truncate">{app.name}</span>
                <Badge variant={statusToBadgeVariant(app.status)} />
              </div>
              <span className="text-[12px] text-text-muted font-mono block truncate">{app.email}</span>
              <div className="flex gap-1.5 flex-wrap">
                {(app.specialties || []).map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 text-[11px] font-mono text-text-secondary bg-surface-muted rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-muted">{formatDate(app.createdAt)}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openReview(app)}
                >
                  Review
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Review Modal */}
      <Modal
        open={!!reviewingApp}
        onClose={() => { setReviewingApp(null); setError(""); setReviewerNotes(""); }}
        title="Review Application"
        size="md"
      >
        {reviewingApp && (
          <div className="space-y-5">
            {/* Applicant info */}
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Name</div>
                <div className="text-[14px] text-text-primary">{reviewingApp.name}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Email</div>
                <div className="text-[13px] text-text-secondary font-mono">{reviewingApp.email}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Specialties</div>
                <div className="flex gap-1.5 flex-wrap">
                  {(reviewingApp.specialties || []).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 text-[11px] font-mono text-text-secondary bg-surface-muted rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Portfolio</div>
                <div className="space-y-1">
                  {(reviewingApp.portfolioLinks || []).length > 0 ? (
                    (reviewingApp.portfolioLinks || []).map((link) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[13px] text-text-primary underline underline-offset-2 decoration-border hover:decoration-text-primary transition-colors truncate"
                      >
                        {link}
                      </a>
                    ))
                  ) : (
                    <span className="text-[13px] text-text-muted italic">No links provided</span>
                  )}
                </div>
              </div>

              {/* Work Samples */}
              {(() => {
                const sampleUrls = getSampleProjectUrls(reviewingApp);
                if (sampleUrls.length === 0) return null;
                return (
                  <div>
                    <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Work Samples</div>
                    <div className="space-y-1.5">
                      {sampleUrls.map((url) => (
                        <div key={url} className="flex items-center gap-2">
                          {isImageUrl(url) ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={url}
                                alt="Work sample"
                                className="w-12 h-12 rounded-md object-cover border border-border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ) : (
                            <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-text-primary font-mono underline underline-offset-2 decoration-border hover:decoration-text-primary transition-colors truncate flex-1"
                          >
                            {url.split("/").pop()?.split("?")[0] || "File"}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Rate</div>
                <div className="text-[13px] text-text-primary font-mono">{reviewingApp.rateExpectation || "Not specified"}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Pitch</div>
                <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">{reviewingApp.pitch || "Not provided"}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Current Status</div>
                <span className="inline-flex">
                  <Badge variant={statusToBadgeVariant(reviewingApp.status)} />
                  <span className="ml-2 text-[12px] text-text-muted">{statusLabel(reviewingApp.status)}</span>
                </span>
              </div>
            </div>

            {/* Reviewer Notes */}
            <div>
              <label
                htmlFor="reviewer-notes"
                className="block text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1.5"
              >
                Reviewer Notes
              </label>
              <textarea
                id="reviewer-notes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Add notes before approving or rejecting..."
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary resize-y min-h-[80px]"
              />
            </div>

            {/* Error display */}
            {error && (
              <p className="text-[12px] text-negative">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleStatusUpdate(reviewingApp.id, "approved")}
                disabled={reviewingApp.status === "approved" || actionLoading}
              >
                {actionLoading ? "Processing..." : "Approve"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleStatusUpdate(reviewingApp.id, "rejected")}
                disabled={reviewingApp.status === "rejected" || actionLoading}
                className="text-negative hover:text-negative"
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
