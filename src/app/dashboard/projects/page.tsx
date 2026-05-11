"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";
import { itemVariants, containerVariants } from "@/lib/motion";

type ProjectStatus = "draft" | "proposal" | "active" | "review" | "completed" | "cancelled";

type ProjectMember = {
  id: string;
  name: string | null;
  image: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  tags: string[];
  pinned: boolean;
  memberCount: number;
  members?: ProjectMember[];
  lastActivity: string;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  proposal: "Proposal",
  review: "In review",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-positive",
  draft: "bg-text-muted/40",
  proposal: "bg-warning",
  review: "bg-blue-500",
  completed: "bg-text-muted/30",
  cancelled: "bg-text-muted/30",
};

function formatUpdated(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Stacked avatar group — up to 4 visible, "+N" overflow chip when more.
// Ring matches the card surface so they read as cleanly nested.
function MemberStack({
  members,
  total,
}: {
  members: ProjectMember[];
  total: number;
}) {
  const visible = members.slice(0, 4);
  const extra = Math.max(0, total - visible.length);
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((m) => (
        <div
          key={m.id}
          title={m.name || undefined}
          className="w-6 h-6 rounded-full bg-surface-muted border border-background overflow-hidden flex items-center justify-center text-[9px] font-medium text-text-muted"
        >
          {m.image ? (
            // Native <img> — these are tiny, the optimizer adds more bytes
            // than it saves at this size.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.image} alt="" className="w-full h-full object-cover" />
          ) : (
            (m.name || "?").charAt(0).toUpperCase()
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full bg-surface-muted border border-background flex items-center justify-center text-[9px] font-mono text-text-muted">
          +{extra}
        </div>
      )}
    </div>
  );
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
// Project Card — the single cell in the new grid layout. Distinct
// shape vs the sidebar nav rows so projects feel tactile + scannable
// at a glance. Layout:
//
//   [● Active]  Title                                   [right-aligned date]
//   description (max 2 lines)
//   [pinned ★]  [👤👤👤+2]  · tags: tag1 tag2
// ---------------------------------------------------------------------------

// Card stagger now imported from the shared motion lib so every
// dashboard surface uses the same curve + lift distance.

function ProjectCard({
  project,
  onOpen,
  onContextMenu,
}: {
  project: Project;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative bg-background border border-border rounded-[12px] p-4 md:p-5 cursor-pointer transition-all hover:border-border-hover hover:-translate-y-px hover:shadow-[0_4px_20px_-12px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:border-text-primary"
      aria-label={`Open project ${project.title}`}
    >
      {/* Top row: status dot + label, then date right-aligned */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              STATUS_DOT[project.status] || "bg-text-muted/40"
            }`}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted tabular-nums flex-shrink-0">
          {formatUpdated(project.lastActivity)}
        </span>
      </div>

      {/* Title + pin marker */}
      <div className="flex items-start gap-2 mb-1">
        {project.pinned && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            className="text-text-primary flex-shrink-0 mt-[3px]"
            aria-label="Pinned"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        <h3 className="text-[15px] md:text-[16px] font-semibold text-text-primary leading-tight tracking-[-0.01em] line-clamp-2">
          {project.title}
        </h3>
      </div>

      {/* Description — 2 lines max so cards stay even-height in the grid */}
      {project.description ? (
        <p className="text-[12px] text-text-muted line-clamp-2 leading-relaxed mb-3 min-h-[34px]">
          {project.description}
        </p>
      ) : (
        <p className="text-[12px] text-text-muted/60 italic mb-3 min-h-[34px]">
          No description yet
        </p>
      )}

      {/* Footer — member avatars left, tags right */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
        <MemberStack
          members={project.members ?? []}
          total={project.memberCount}
        />
        <div className="flex items-center gap-1.5 min-w-0">
          {(project.tags || []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-muted text-text-muted whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
          {(project.tags || []).length > 2 && (
            <span className="text-[10px] font-mono text-text-muted/60">
              +{project.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "active" | "completed";

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const s = searchParams.get("status");
    return s === "active" || s === "completed" ? s : "all";
  });

  // Re-sync status from URL when sidebar quick action navigates here.
  useEffect(() => {
    const s = searchParams.get("status");
    setStatusFilter(s === "active" || s === "completed" ? s : "all");
  }, [searchParams]);

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
    if (statusFilter === "active") {
      if (p.status === "completed" || p.status === "cancelled") return false;
    }
    if (statusFilter === "completed") {
      if (p.status !== "completed") return false;
    }
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

  // Group projects into "Pinned · Active · Other" buckets so the page
  // reads as a board and not a flat list. Pinned always first; Active
  // groups everything that's actually live work; Other catches drafts +
  // completed when the user toggles those filters in.
  const buckets = (() => {
    const pinned: Project[] = [];
    const active: Project[] = [];
    const other: Project[] = [];
    for (const p of filtered) {
      if (p.pinned) pinned.push(p);
      else if (p.status === "active" || p.status === "review" || p.status === "proposal") active.push(p);
      else other.push(p);
    }
    return { pinned, active, other };
  })();

  const counts = {
    total: projects.length,
    active: projects.filter((p) =>
      p.status === "active" || p.status === "review" || p.status === "proposal"
    ).length,
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sticky header — same shell every dashboard page uses (px-4
          md:px-8, pt-4 md:pt-6, pb-3, 20px h1, tracking-[-0.02em])
          so the title left-edge + baseline lock together when the
          user navigates between Projects → Earnings → Inbox etc.
          The count subtitle reads under the title, never widening
          the header. */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
              Projects
            </h1>
            {counts.total > 0 && (
              <p className="text-[11px] font-mono text-text-muted mt-0.5 tabular-nums">
                {counts.total} total
                {counts.active > 0 ? ` · ${counts.active} active` : ""}
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/teams/new")}>
            Start project
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 pt-3">

      {/* Filter rail — search left, status tabs right. Keeps everything
          on one row at md+ so the cards get more vertical real estate. */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[420px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full text-[13px] text-text-primary placeholder:text-text-muted bg-surface-muted border border-transparent rounded-md pl-9 pr-3 py-2 outline-none focus:border-border-hover transition-colors"
          />
        </div>
        <div className="flex items-center gap-0.5 ml-auto">
          {(["all", "active", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                const url = new URL(window.location.href);
                if (s === "all") url.searchParams.delete("status");
                else url.searchParams.set("status", s);
                router.replace(url.pathname + (url.search || ""));
              }}
              className={`relative px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer capitalize ${
                statusFilter === s
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
              aria-selected={statusFilter === s}
            >
              {s}
              {statusFilter === s && (
                <span className="absolute left-3 right-3 -bottom-px h-[1.5px] bg-text-primary" />
              )}
            </button>
          ))}
        </div>
        {/* Tag filter only shows when projects use tags — otherwise it's noise */}
        {allTags.length > 0 && (
          <div className="basis-full flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilterTag(null)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                !filterTag
                  ? "bg-text-primary text-background"
                  : "bg-surface-muted text-text-muted hover:text-text-secondary"
              }`}
            >
              All tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                  filterTag === tag
                    ? "bg-text-primary text-background"
                    : "bg-surface-muted text-text-muted hover:text-text-secondary"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Skeleton → grid swap is wrapped in AnimatePresence so the
          loader fades out as the cards stagger in, instead of an
          instant flicker. mode="wait" keeps the layout from jumping. */}
      <AnimatePresence mode="wait" initial={false}>
        {isLoading && (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[124px] bg-surface-muted rounded-[12px] animate-pulse"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty — bigger, more inviting */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">
            {searchQuery || filterTag ? "Nothing matches" : "Nothing in flight"}
          </p>
          <p className="text-[12px] text-text-muted mb-4 max-w-[320px] leading-relaxed">
            {searchQuery || filterTag
              ? "Loosen the filters or clear the search to see everything."
              : "Start a project — chat, tasks, payments, deliverables, all in one place."}
          </p>
          {!searchQuery && !filterTag && (
            <Button variant="primary" size="md" onClick={() => router.push("/browse")}>
              Find a coder
            </Button>
          )}
        </div>
      )}

      {/* Grouped grid — Pinned · Active · Other. Each section only
          renders when it has projects. Cards stagger in via the
          parent motion container's variants — feels like the board
          is laying itself out, not flashing into existence. */}
      {!isLoading && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="space-y-7"
        >
          {[
            { key: "pinned", label: "Pinned", items: buckets.pinned },
            { key: "active", label: "Active", items: buckets.active },
            { key: "other", label: "Other", items: buckets.other },
          ]
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.key}>
                {/* Section header is hidden when only ONE bucket has data —
                    no point shouting "Active" if there's nothing else. */}
                {(buckets.pinned.length > 0 ? 1 : 0) +
                  (buckets.active.length > 0 ? 1 : 0) +
                  (buckets.other.length > 0 ? 1 : 0) >
                  1 && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center gap-2 mb-3"
                  >
                    <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                      {g.label}
                    </p>
                    <span className="text-[10px] font-mono text-text-muted/60 tabular-nums">
                      {g.items.length}
                    </span>
                  </motion.div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                  {g.items.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => router.push(`/dashboard/projects/${project.id}`)}
                      onContextMenu={(e) => handleContextMenu(e, project)}
                    />
                  ))}
                </div>
              </section>
            ))}
        </motion.div>
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
