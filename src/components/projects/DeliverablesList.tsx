"use client";

import { useState, useEffect, useRef } from "react";

type DeliverableStatus = "pending" | "submitted" | "approved" | "revision_requested";

type Deliverable = {
  id: string;
  title: string;
  fileUrl: string | null;
  liveUrl: string | null;
  status: DeliverableStatus;
  submittedBy: string | null;
  submitterName: string;
  createdAt: string;
};

interface DeliverablesListProps {
  projectId: string;
  currentUserId?: string;
  isCreator: boolean;
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending: "Pending",
  submitted: "Submitted",
  approved: "Approved",
  revision_requested: "Revision Requested",
};

const STATUS_COLORS: Record<DeliverableStatus, string> = {
  pending: "#a3a3a3",
  submitted: "#f59e0b",
  approved: "#22c55e",
  revision_requested: "#ef4444",
};

function StatusBadge({ status }: { status: DeliverableStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="text-[11px] font-mono px-2 py-0.5 rounded-md inline-flex items-center gap-1.5"
      style={{ color, backgroundColor: `${color}14` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function FileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RevisionIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

export default function DeliverablesList({
  projectId,
  currentUserId,
  isCreator,
}: DeliverablesListProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newLiveUrl, setNewLiveUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/deliverables`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDeliverables(data))
      .catch(() => setDeliverables([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleSubmitDeliverable = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          fileUrl: newFileUrl.trim() || undefined,
          liveUrl: newLiveUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setDeliverables((prev) => [created, ...prev]);
        setNewTitle("");
        setNewFileUrl("");
        setNewLiveUrl("");
        setIsAdding(false);
      }
    } catch {
      // Silently fail -- user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (
    deliverableId: string,
    status: "approved" | "revision_requested"
  ) => {
    setUpdatingId(deliverableId);
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId, status }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDeliverables((prev) =>
          prev.map((d) => (d.id === deliverableId ? updated : d))
        );
      }
    } catch {
      // Silently fail -- user can retry
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddClick = () => {
    setIsAdding(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setNewTitle("");
      setNewFileUrl("");
      setNewLiveUrl("");
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-[#e5e5e5] rounded-lg p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-neutral-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#e5e5e5] rounded-lg overflow-hidden">
      {/* Submit form for creators */}
      {isCreator && (
        <div className="border-b border-[#e5e5e5]">
          {isAdding ? (
            <div className="px-4 py-3 space-y-2.5">
              <input
                ref={titleInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Deliverable title..."
                className="w-full text-[13px] font-body text-[#0a0a0a] placeholder:text-neutral-400 bg-transparent outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="File URL (optional)"
                  className="flex-1 text-[12px] font-body text-[#0a0a0a] placeholder:text-neutral-400 bg-neutral-50 border border-[#e5e5e5] rounded-md px-2.5 py-1.5 outline-none focus:border-neutral-400 transition-colors duration-150"
                />
                <input
                  type="url"
                  value={newLiveUrl}
                  onChange={(e) => setNewLiveUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Live URL (optional)"
                  className="flex-1 text-[12px] font-body text-[#0a0a0a] placeholder:text-neutral-400 bg-neutral-50 border border-[#e5e5e5] rounded-md px-2.5 py-1.5 outline-none focus:border-neutral-400 transition-colors duration-150"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setNewTitle("");
                    setNewFileUrl("");
                    setNewLiveUrl("");
                    setIsAdding(false);
                  }}
                  className="text-[12px] font-body text-neutral-500 hover:text-[#0a0a0a] px-3 py-1.5 rounded-md transition-colors duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitDeliverable}
                  disabled={!newTitle.trim() || submitting}
                  className="text-[12px] font-body text-white bg-[#0a0a0a] hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md transition-colors duration-150 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddClick}
              className="flex items-center gap-3 w-full px-4 py-3 cursor-pointer hover:opacity-70 transition-opacity duration-150"
            >
              <div className="w-4 h-4 flex items-center justify-center text-neutral-400">
                <PlusIcon />
              </div>
              <span className="text-[13px] font-body text-neutral-400">
                Submit deliverable
              </span>
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {deliverables.length === 0 && !isAdding && (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-neutral-500 font-body">
            No deliverables yet
          </p>
        </div>
      )}

      {/* Deliverables list */}
      {deliverables.map((d, i) => (
        <div
          key={d.id}
          className={`px-4 py-3 ${
            i < deliverables.length - 1 ? "border-b border-[#e5e5e5]" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            {/* File icon */}
            <div className="w-4 h-4 text-neutral-400 flex-shrink-0">
              <FileIcon />
            </div>

            {/* Title and submitter */}
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-body text-[#0a0a0a] block truncate">
                {d.title}
              </span>
              <span className="text-[11px] font-body text-neutral-500">
                by {d.submitterName}
                {" -- "}
                {new Date(d.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Links */}
            {d.fileUrl && (
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-[#0a0a0a] transition-colors duration-150"
              >
                <LinkIcon />
                File
              </a>
            )}
            {d.liveUrl && (
              <a
                href={d.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-[#0a0a0a] transition-colors duration-150"
              >
                <LinkIcon />
                Live
              </a>
            )}

            {/* Status badge */}
            <StatusBadge status={d.status} />
          </div>

          {/* Review actions for non-creators on submitted deliverables */}
          {!isCreator && d.status === "submitted" && (
            <div className="flex items-center gap-2 mt-2.5 ml-7">
              <button
                onClick={() => handleReview(d.id, "approved")}
                disabled={updatingId === d.id}
                className="flex items-center gap-1.5 text-[12px] font-body text-[#22c55e] hover:bg-[#22c55e14] disabled:opacity-40 px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer"
              >
                <CheckIcon />
                Approve
              </button>
              <button
                onClick={() => handleReview(d.id, "revision_requested")}
                disabled={updatingId === d.id}
                className="flex items-center gap-1.5 text-[12px] font-body text-[#ef4444] hover:bg-[#ef444414] disabled:opacity-40 px-2.5 py-1 rounded-md transition-colors duration-150 cursor-pointer"
              >
                <RevisionIcon />
                Request revision
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
