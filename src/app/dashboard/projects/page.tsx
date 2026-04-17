"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";

type ProjectStatus = "draft" | "proposal" | "active" | "review" | "completed" | "cancelled";

type Project = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  pinned: boolean;
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

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  active: { text: "#22c55e", bg: "#22c55e14" },
  draft: { text: "#a3a3a3", bg: "#f5f5f5" },
  proposal: { text: "#f59e0b", bg: "#f59e0b14" },
  review: { text: "#3b82f6", bg: "#3b82f614" },
  completed: { text: "#a3a3a3", bg: "#f5f5f5" },
  cancelled: { text: "#a3a3a3", bg: "#f5f5f5" },
};

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

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

type ContextMenuState = {
  x: number;
  y: number;
  project: Project;
} | null;

function ContextMenu({
  state,
  onClose,
  onPin,
  onArchive,
  onDelete,
  onOpen,
  onOpenChat,
  onCopyId,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenChat: (id: string) => void;
  onCopyId: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [state, onClose]);

  if (!state) return null;

  const p = state.project;
  const isCompleted = p.status === "completed" || p.status === "cancelled";

  // Ensure menu stays within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(state.x, typeof window !== "undefined" ? window.innerWidth - 200 : state.x),
    top: Math.min(state.y, typeof window !== "undefined" ? window.innerHeight - 300 : state.y),
    zIndex: 100,
  };

  return (
    <div ref={ref} style={style} className="w-[190px] bg-background border border-border rounded-lg shadow-lg py-1 animate-[fadeInUp_0.1s_ease-out]">
      <button onClick={() => { onOpen(p.id); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-text-primary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open project
      </button>
      <button onClick={() => { onOpenChat(p.id); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-text-primary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Open chat
      </button>

      <div className="h-px bg-border my-1" />

      <button onClick={() => { onPin(p.id, !p.pinned); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-text-primary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill={p.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        {p.pinned ? "Unpin" : "Pin to top"}
      </button>

      <button onClick={() => { onCopyId(p.id); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy link
      </button>

      {!isCompleted && (
        <>
          <div className="h-px bg-border my-1" />
          <button onClick={() => { onArchive(p.id); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/></svg>
            Archive
          </button>
        </>
      )}

      {p.status === "draft" && (
        <button onClick={() => { onDelete(p.id); onClose(); }} className="w-full text-left px-3 py-2 text-[12px] text-negative hover:bg-negative/5 transition-colors cursor-pointer flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return;
      const data: Project[] = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Collect all unique tags
  const allTags = Array.from(new Set(projects.flatMap((p) => p.tags || [])));

  // Filter + search
  const filtered = projects.filter((p) => {
    if (filterTag && !(p.tags || []).includes(filterTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  // Handlers
  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, project });
  };

  const handlePin = async (id: string, pinned: boolean) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, pinned } : p)));
    try {
      await fetch("/api/projects/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, pinned }),
      });
      toast(pinned ? "Project pinned" : "Project unpinned", "success");
    } catch {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !pinned } : p)));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        toast("Project archived", "success");
      }
    } catch { /* */ }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        toast("Project deleted", "success");
      }
    } catch { /* */ }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/projects/${id}`);
    toast("Link copied", "success");
  };

  return (
    <div className="max-w-[720px] h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary">Projects</h1>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/teams/new")}>
            New project
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {/* Search + tag filter */}
      <div className="mb-4 space-y-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full text-[13px] text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-9 pr-3 py-2 outline-none focus:border-border-hover transition-colors"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilterTag(null)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                !filterTag ? "bg-[#171717] text-white" : "bg-surface-muted text-text-muted hover:text-text-secondary"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                  filterTag === tag ? "bg-[#171717] text-white" : "bg-surface-muted text-text-muted hover:text-text-secondary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-muted rounded-[10px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-text-muted mb-4">
            {searchQuery || filterTag ? "No matching projects" : "No projects yet"}
          </p>
          {!searchQuery && !filterTag && (
            <Button variant="primary" size="md" onClick={() => router.push("/browse")}>
              Browse coders
            </Button>
          )}
        </div>
      )}

      {/* Project cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((project) => {
            const sc = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
            return (
              <div
                key={project.id}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                onContextMenu={(e) => handleContextMenu(e, project)}
                className={`border border-border rounded-[10px] px-4 py-3 cursor-pointer transition-all hover:border-border-hover hover:shadow-sm group ${
                  project.pinned ? "bg-surface-muted/30" : "bg-background"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {project.pinned && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-text-muted flex-shrink-0">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      )}
                      <span className="text-[14px] font-medium text-text-primary truncate">
                        {project.title}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ color: sc.text, backgroundColor: sc.bg }}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-[12px] text-text-muted truncate">{project.description}</p>
                    )}
                    {(project.tags || []).length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {project.tags.map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                    <span className="text-[11px] font-mono text-text-muted">{project.memberCount} members</span>
                    <span className="text-[11px] font-mono text-text-muted">{formatUpdated(project.lastActivity)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted group-hover:text-text-primary transition-colors">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Context menu */}
      <ContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onPin={handlePin}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onOpen={(id) => router.push(`/dashboard/projects/${id}`)}
        onOpenChat={(id) => router.push(`/dashboard/projects/${id}`)}
        onCopyId={handleCopyId}
      />
    </div>
  );
}
