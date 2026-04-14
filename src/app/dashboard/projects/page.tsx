"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { mockProjects, ProjectStatus } from "@/lib/mock-data";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "text-text-primary",
  draft: "text-text-muted",
  completed: "text-text-muted",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  draft: "Draft",
  completed: "Completed",
};

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function formatUpdated(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  const router = useRouter();

  return (
    <div className="px-6 py-6 max-w-[720px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-text-primary font-display">
          Projects
        </h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/dashboard/teams/new")}
        >
          New project
        </Button>
      </div>

      {/* Project list */}
      {mockProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-text-muted font-body mb-4">
            No projects yet
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/dashboard/teams/new")}
          >
            Build a team
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-[10px] overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-muted">
            <span className="flex-1 text-[11px] font-mono text-text-muted uppercase tracking-wider">
              Project
            </span>
            <span className="w-20 text-[11px] font-mono text-text-muted uppercase tracking-wider text-center">
              Status
            </span>
            <span className="w-14 text-[11px] font-mono text-text-muted uppercase tracking-wider text-center">
              Team
            </span>
            <span className="w-20 text-[11px] font-mono text-text-muted uppercase tracking-wider text-right">
              Updated
            </span>
            <span className="w-[14px]" />
          </div>

          {/* Rows */}
          {mockProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/dashboard/projects/1`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-alt transition-colors duration-150 cursor-pointer border-b border-border last:border-b-0"
            >
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-text-primary font-body block truncate">
                  {project.title}
                </span>
                <p className="text-[12px] text-text-muted font-body truncate mt-0.5">
                  {project.description}
                </p>
              </div>

              {/* Status */}
              <span
                className={`w-20 text-center text-[11px] font-mono ${STATUS_STYLES[project.status]}`}
              >
                {STATUS_LABELS[project.status]}
              </span>

              {/* Member count */}
              <div className="w-14 flex items-center justify-center gap-1 text-text-muted flex-shrink-0">
                <UsersIcon />
                <span className="text-[11px] font-mono">{project.teamMemberIds.length}</span>
              </div>

              {/* Updated */}
              <span className="w-20 text-right text-[11px] font-mono text-text-muted flex-shrink-0">
                {formatUpdated(project.updatedAt)}
              </span>

              {/* Chevron */}
              <span className="text-text-muted flex-shrink-0">
                <ChevronRightIcon />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
