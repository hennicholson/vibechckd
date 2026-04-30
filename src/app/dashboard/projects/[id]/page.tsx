"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import ProjectChat from "@/components/projects/ProjectChat";
import TaskList from "@/components/projects/TaskList";
import DeliverablesList from "@/components/projects/DeliverablesList";

type Tab = "chat" | "tasks" | "deliverables" | "details";

const tabs: { key: Tab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "tasks", label: "Tasks" },
  { key: "deliverables", label: "Deliverables" },
  { key: "details", label: "Details" },
];

type ProjectData = {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  budget: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  members: {
    userId: string;
    name: string;
    role: string;
    avatarUrl: string;
    slug: string;
    specialties: string[];
    verified: boolean;
  }[];
};

type TaskData = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeImage: string;
};

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = params.id as string;
  const currentUserId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProject(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Fetch tasks when switching to tasks tab
  useEffect(() => {
    if (activeTab === "tasks") {
      setTasksLoading(true);
      fetch(`/api/projects/${projectId}/tasks`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setTasks(data))
        .catch(() => setTasks([]))
        .finally(() => setTasksLoading(false));
    }
  }, [activeTab, projectId]);

  // Close settings dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showSettings]);

  const handleArchive = async () => {
    setShowSettings(false);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    router.push("/dashboard/projects");
  };

  const handleDelete = async () => {
    setShowSettings(false);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/dashboard/projects");
    }
  };

  const handleEditTitle = () => {
    setEditTitle(project?.title || "");
    setIsEditing(true);
  };

  const handleOpenSettings = () => {
    setEditTitle(project?.title || "");
    setEditDesc(project?.description || "");
    setEditTags(project?.tags || []);
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {};
    if (editTitle.trim() !== project?.title) body.title = editTitle.trim();
    if (editDesc !== (project?.description || "")) body.description = editDesc;
    if (JSON.stringify(editTags) !== JSON.stringify(project?.tags || [])) body.tags = editTags;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setShowSettings(false);
      return;
    }

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setProject((prev) => prev ? { ...prev, ...data, tags: data.tags || [] } : prev);
    }
    setSaving(false);
    setShowSettings(false);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const handleSaveTitle = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === project?.title) {
      setIsEditing(false);
      return;
    }
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    if (res.ok) {
      setProject((prev) => (prev ? { ...prev, title: trimmed } : prev));
    }
    setIsEditing(false);
  };

  const handleAddTask = async (title: string) => {
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
    }
  };

  const title = project?.title || "Project";
  const description = project?.description || "";
  const status = project?.status || "active";
  const members = project?.members || [];
  const createdAt = project?.createdAt || new Date().toISOString();

  if (loading) {
    return (
      <div className="w-full px-4 md:px-8 py-6">
        <div className="h-6 w-48 bg-neutral-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-full max-w-[384px] bg-neutral-100 rounded animate-pulse mb-6" />
        <div className="h-[400px] bg-neutral-100 rounded-[10px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-8 py-3 md:py-4">
      {/* Header */}
      <div className="mb-3 md:mb-4">
        <div className="flex items-center gap-2 mb-1">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") { setIsEditing(false); setEditTitle(title); }
                }}
                autoFocus
                className="flex-1 min-w-0 text-[18px] font-semibold text-text-primary leading-tight bg-surface-muted border border-border rounded-md px-2 py-1 outline-none focus:border-border-hover transition-colors"
              />
              <button
                onClick={handleSaveTitle}
                className="flex-shrink-0 w-7 h-7 rounded-md bg-[#171717] text-white flex items-center justify-center hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                title="Save"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditTitle(title); }}
                className="flex-shrink-0 w-7 h-7 rounded-md border border-border text-text-muted flex items-center justify-center hover:text-text-primary hover:border-border-hover transition-colors cursor-pointer"
                title="Cancel"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <h1
              onClick={() => { setEditTitle(title); setIsEditing(true); }}
              className="text-[18px] font-semibold text-text-primary leading-tight cursor-text hover:text-text-secondary transition-colors"
              title="Click to rename"
            >
              {title}
            </h1>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-muted text-text-muted flex-shrink-0">
            {status}
          </span>

          {/* Settings button */}
          <button
            onClick={handleOpenSettings}
            className="ml-auto p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer flex-shrink-0"
          >
            <SettingsIcon />
          </button>
        </div>
        {description && (
          <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed hidden md:block line-clamp-1">
            {description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] font-mono text-neutral-500">
            {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <span className="text-[11px] text-[#e5e5e5]">|</span>
          <span className="text-[11px] font-mono text-neutral-500">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
          {(project?.tags || []).length > 0 && (
            <>
              <span className="text-[11px] text-[#e5e5e5]">|</span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {(project?.tags || []).map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium whitespace-nowrap">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Members row */}
        {members.length > 0 && (
          <div className="hidden md:flex flex-wrap items-center gap-3 mt-3">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-[10px] font-medium text-neutral-500 overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    m.name.charAt(0)
                  )}
                </div>
                <span className="text-[12px] text-neutral-600">{m.name}</span>
                <span className="text-[10px] font-mono text-neutral-500">({m.role})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segmented Control */}
      <div className="inline-flex bg-neutral-100 rounded-lg p-0.5 mb-3 md:mb-4 max-w-full overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
              activeTab === tab.key
                ? "text-[#0a0a0a]"
                : "text-neutral-500 hover:text-neutral-600"
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="project-tab"
                className="absolute inset-0 bg-white border border-[#e5e5e5] rounded-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "chat" && (
        <div className="border border-[#e5e5e5] rounded-[10px] overflow-hidden h-[calc(100dvh-240px)] md:h-[calc(100dvh-260px)]">
          <ProjectChat projectId={projectId} members={members.map((m) => ({ userId: m.userId, name: m.name, role: m.role }))} />
        </div>
      )}
      {activeTab === "tasks" && (
        tasksLoading ? (
          <div className="border border-[#e5e5e5] rounded-lg p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <TaskList
            projectId={projectId}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              assigneeId: t.assigneeId,
              assigneeName: t.assigneeName,
              assigneeImage: t.assigneeImage,
              status: t.status,
              dueDate: t.dueDate || "",
            }))}
            members={members.map((m) => ({ userId: m.userId, name: m.name, role: m.role }))}
            onAddTask={handleAddTask}
          />
        )
      )}
      {activeTab === "deliverables" && (
        <DeliverablesList
          projectId={projectId}
          currentUserId={currentUserId}
          isCreator={members.some(
            (m) => m.userId === currentUserId && m.role !== "client"
          )}
        />
      )}
      {activeTab === "details" && (
        <div className="border border-[#e5e5e5] rounded-[10px] p-5">
          <p className="text-[14px] text-neutral-600 leading-[1.6]">{description}</p>
          {members.length > 0 && (
            <div className="mt-5 border-t border-[#e5e5e5] pt-5">
              <p className="text-[11px] font-mono uppercase text-neutral-500 mb-3">Team</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-[12px] font-medium text-neutral-500 overflow-hidden">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        m.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0a0a0a]">{m.name}</p>
                      <p className="text-[11px] text-neutral-500">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings panel overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-[380px] bg-background border-l border-border h-full overflow-y-auto animate-[slideInRight_0.2s_ease-out]">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-[15px] font-semibold text-text-primary">Project Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Project name</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-[13px] text-text-primary bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  placeholder="What is this project about?"
                  className="w-full text-[13px] text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none resize-none focus:border-border-hover transition-colors"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-surface-muted text-text-secondary font-medium">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-text-muted hover:text-negative cursor-pointer">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag..."
                    className="flex-1 text-[12px] text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-border-hover transition-colors"
                  />
                  <button onClick={addTag} disabled={!newTag.trim()} className="text-[11px] font-medium text-text-secondary border border-border rounded-md px-2.5 py-1.5 hover:border-border-hover transition-colors cursor-pointer disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Status</label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-muted text-text-muted">{status}</span>
              </div>

              {/* Team */}
              <div>
                <label className="text-[12px] font-medium text-text-secondary mb-2 block">Team</label>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted overflow-hidden">
                        {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" /> : m.name.charAt(0)}
                      </div>
                      <span className="text-[12px] text-text-primary flex-1">{m.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-2 text-[13px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer disabled:opacity-40"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              {/* Danger zone */}
              <div className="pt-4 border-t border-border space-y-2">
                <button
                  onClick={() => { handleArchive(); setShowSettings(false); }}
                  className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                >
                  Archive project
                </button>
                {status === "draft" && (
                  <button
                    onClick={() => { handleDelete(); setShowSettings(false); }}
                    className="w-full text-left px-3 py-2 text-[12px] text-negative hover:bg-negative/5 rounded-md transition-colors cursor-pointer"
                  >
                    Delete project
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
