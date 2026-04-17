"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";

type ProjectStatus = "draft" | "proposal" | "active" | "review" | "completed" | "cancelled";

type Project = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  memberCount: number;
  lastActivity: string;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  proposal: "Proposal",
  review: "Review",
  completed: "Completed",
  cancelled: "Cancelled",
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

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data: Project[] = await res.json();
      setProjects(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleArchive = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const isCompleted = (status: string) =>
    status === "completed" || status === "cancelled";

  return (
    <div className="px-4 md:px-8 py-6 max-w-[720px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-text-primary">
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

      {/* Loading skeleton */}
      {isLoading && (
        <div className="border border-border rounded-[10px] overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
            >
              <div className="flex-1">
                <div className="h-4 w-40 bg-surface-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-64 bg-surface-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-14 bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-10 bg-surface-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-surface-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-text-muted mb-4">
            No projects yet -- browse coders to get started
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/browse")}
          >
            Browse coders
          </Button>
        </div>
      )}

      {/* Project list */}
      {!isLoading && projects.length > 0 && (
        <div className="border border-border rounded-[10px] overflow-hidden">
          {/* Column headers */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border bg-surface-muted">
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
            <span className="w-[72px]" />
          </div>

          {/* Rows */}
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer border-b border-border last:border-b-0 ${
                isCompleted(project.status)
                  ? "bg-surface-muted opacity-60"
                  : "bg-background hover:bg-background-alt"
              }`}
            >
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-text-primary block truncate">
                  {project.title}
                </span>
                <p className="text-[12px] text-text-muted truncate mt-0.5">
                  {project.description}
                </p>
              </div>

              {/* Status */}
              <span className={`hidden md:block w-20 text-center text-[11px] font-mono ${
                isCompleted(project.status) ? "text-text-muted" : "text-text-primary"
              }`}>
                {STATUS_LABELS[project.status] || project.status}
              </span>

              {/* Member count */}
              <div className="hidden md:flex w-14 items-center justify-center gap-1 text-text-muted flex-shrink-0">
                <UsersIcon />
                <span className="text-[11px] font-mono">{project.memberCount}</span>
              </div>

              {/* Updated */}
              <span className="hidden md:block w-20 text-right text-[11px] font-mono text-text-muted flex-shrink-0">
                {formatUpdated(project.lastActivity)}
              </span>

              {/* Mobile status badge */}
              <span className="md:hidden text-[11px] font-mono text-text-muted flex-shrink-0">
                {STATUS_LABELS[project.status] || project.status}
              </span>

              {/* Actions */}
              <div className="hidden md:flex w-[72px] items-center justify-end gap-1 flex-shrink-0">
                {!isCompleted(project.status) && (
                  <button
                    onClick={(e) => handleArchive(e, project.id)}
                    disabled={actionLoading === project.id}
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors duration-150 cursor-pointer disabled:opacity-40"
                    title="Archive project"
                  >
                    <ArchiveIcon />
                  </button>
                )}
                {project.status === "draft" && (
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    disabled={actionLoading === project.id}
                    className="p-1.5 rounded-md text-text-muted hover:text-negative hover:bg-negative/10 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                    title="Delete draft"
                  >
                    <TrashIcon />
                  </button>
                )}
                <span className="text-text-muted flex-shrink-0 ml-0.5">
                  <ChevronRightIcon />
                </span>
              </div>

              {/* Mobile chevron */}
              <span className="md:hidden text-text-muted flex-shrink-0">
                <ChevronRightIcon />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
