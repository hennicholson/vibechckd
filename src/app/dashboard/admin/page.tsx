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
  rateExpectation: string;
  pitch: string;
  status: ApplicationStatus;
  createdAt: string;
};

// ── Mock Data (fallback) ──

const fallbackApplications: Application[] = [
  {
    id: "app-1",
    userId: null,
    name: "Alex Rivera",
    email: "alex@example.com",
    specialties: ["frontend", "full-stack"],
    portfolioLinks: ["https://alexrivera.dev"],
    rateExpectation: "$120-180/hr",
    pitch: "I build interfaces that feel alive. 5 years at startups, shipped 20+ products.",
    status: "applied",
    createdAt: "2026-04-12",
  },
  {
    id: "app-2",
    userId: null,
    name: "Jordan Lee",
    email: "jordan@example.com",
    specialties: ["backend", "automation"],
    portfolioLinks: ["https://github.com/jordanlee"],
    rateExpectation: "$100-160/hr",
    pitch: "Backend specialist with expertise in event-driven architectures and DevOps.",
    status: "under_review",
    createdAt: "2026-04-10",
  },
  {
    id: "app-3",
    userId: null,
    name: "Morgan Taylor",
    email: "morgan@example.com",
    specialties: ["security"],
    portfolioLinks: ["https://morgansec.io"],
    rateExpectation: "$180-280/hr",
    pitch: "Former pentester turned builder. I audit and harden codebases.",
    status: "applied",
    createdAt: "2026-04-13",
  },
];

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

// ── Component ──

export default function AdminPage() {
  const [tab, setTab] = useState<"applications">("applications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewingApp, setReviewingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch applications from the database on mount
  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch("/api/admin/applications");
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        if (data.applications && data.applications.length > 0) {
          setApplications(data.applications);
        } else {
          // Fall back to mock data if no DB applications exist
          setApplications(fallbackApplications);
        }
      } catch (err) {
        console.error("Failed to fetch applications:", err);
        // Fall back to mock data on error
        setApplications(fallbackApplications);
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, []);

  async function handleApprove(id: string) {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to approve application");
        setActionLoading(false);
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "approved" as ApplicationStatus } : a))
      );
      setReviewingApp(null);
    } catch {
      setError("Failed to approve application. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reject application");
        setActionLoading(false);
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" as ApplicationStatus } : a))
      );
      setReviewingApp(null);
    } catch {
      setError("Failed to reject application. Please try again.");
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
            <span className="ml-1.5 text-[11px] font-mono text-text-muted">
              {applications.filter((a) => a.status !== "approved" && a.status !== "rejected").length}
            </span>
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

      {/* Applications Tab */}
      {!loading && tab === "applications" && (
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
                onClick={() => setReviewingApp(app)}
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
                  onClick={() => setReviewingApp(app)}
                >
                  Review
                </Button>
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="px-3 py-12 text-center text-[13px] text-text-muted">
              No applications to review.
            </div>
          )}
        </div>
      )}

      </div>

      {/* Review Modal */}
      <Modal
        open={!!reviewingApp}
        onClose={() => { setReviewingApp(null); setError(""); }}
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
                  {(reviewingApp.portfolioLinks || []).map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[13px] text-text-primary underline underline-offset-2 decoration-border hover:decoration-text-primary transition-colors"
                    >
                      {link}
                    </a>
                  ))}
                  {(!reviewingApp.portfolioLinks || reviewingApp.portfolioLinks.length === 0) && (
                    <span className="text-[13px] text-text-muted italic">No links provided</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Rate</div>
                <div className="text-[13px] text-text-primary font-mono">{reviewingApp.rateExpectation || "Not specified"}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Pitch</div>
                <div className="text-[13px] text-text-secondary leading-relaxed">{reviewingApp.pitch || "Not provided"}</div>
              </div>
              <div>
                <div className="text-[11px] font-mono text-text-muted uppercase tracking-wide mb-1">Current Status</div>
                <span className="inline-flex">
                  <Badge variant={statusToBadgeVariant(reviewingApp.status)} />
                  <span className="ml-2 text-[12px] text-text-muted">{statusLabel(reviewingApp.status)}</span>
                </span>
              </div>
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
                onClick={() => handleApprove(reviewingApp.id)}
                disabled={reviewingApp.status === "approved" || actionLoading}
              >
                {actionLoading ? "Processing..." : "Approve"}
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleReject(reviewingApp.id)}
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
