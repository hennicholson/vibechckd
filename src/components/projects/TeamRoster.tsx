"use client";

import { Coder } from "@/lib/mock-data";
import Badge from "@/components/Badge";
import Button from "@/components/Button";

interface TeamRosterProps {
  projectName: string;
  members: Coder[];
  onViewDeliverables?: () => void;
}

export default function TeamRoster({
  projectName,
  members,
  onViewDeliverables,
}: TeamRosterProps) {
  return (
    <div className="w-[280px] shrink-0 border-r border-border bg-background flex flex-col">
      {/* Project name */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[13px] font-mono text-text-muted tracking-tight">
          Project
        </p>
        <h2 className="text-[15px] font-semibold text-text-primary mt-1 leading-snug">
          {projectName}
        </h2>
      </div>

      {/* Team heading */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
          Team
        </p>
      </div>

      {/* Client row */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a3a3a3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-medium text-text-primary">
            Client
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            Project Lead
          </span>
        </div>
      </div>

      {/* Coder rows */}
      {members.map((coder) => (
        <div
          key={coder.id}
          className="px-5 py-3 border-b border-border flex items-center gap-3"
        >
          <img
            src={coder.avatarUrl}
            alt={coder.displayName}
            className="w-8 h-8 rounded-lg object-cover"
          />
          <div className="flex flex-col min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-text-primary truncate">
                {coder.displayName}
              </span>
              {coder.verified && <Badge variant="verified" size="sm" />}
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              {coder.title}
            </span>
          </div>
        </div>
      ))}

      {/* View deliverables button */}
      <div className="mt-auto p-4">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onViewDeliverables}
        >
          View Deliverables
        </Button>
      </div>
    </div>
  );
}
