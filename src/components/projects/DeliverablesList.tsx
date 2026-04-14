"use client";

import { MockDeliverable, DeliverableStatus, coders } from "@/lib/mock-data";

interface DeliverablesListProps {
  deliverables: MockDeliverable[];
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending: "Pending",
  submitted: "Submitted",
  approved: "Approved",
};

function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  const base = "text-[11px] font-mono px-2 py-0.5 rounded-md";
  const styles: Record<DeliverableStatus, string> = {
    pending: "text-text-muted bg-surface-muted",
    submitted: "text-text-primary bg-surface-muted",
    approved: "text-text-primary bg-surface-muted",
  };
  return (
    <span className={`${base} ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function DeliverablesList({
  deliverables,
}: DeliverablesListProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {deliverables.map((d, i) => {
        const submitter = d.submittedById
          ? coders.find((c) => c.id === d.submittedById)
          : null;

        return (
          <div
            key={d.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < deliverables.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* File icon */}
            <div className="w-4 h-4 text-text-muted flex-shrink-0">
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
            </div>

            {/* Title */}
            <span className="flex-1 text-[13px] text-text-primary">
              {d.title}
            </span>

            {/* Live URL */}
            {d.liveUrl && (
              <span className="text-[11px] font-mono text-text-muted">
                {d.liveUrl}
              </span>
            )}

            {/* Submitter avatar */}
            {submitter && (
              <img
                src={submitter.avatarUrl}
                alt={submitter.displayName}
                title={submitter.displayName}
                className="w-5 h-5 rounded object-cover flex-shrink-0"
              />
            )}

            {/* Status badge */}
            <DeliverableStatusBadge status={d.status} />
          </div>
        );
      })}
    </div>
  );
}
