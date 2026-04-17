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
    setShowSettings(false);
    setEditTitle(project?.title || "");
    setIsEditing(true);
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
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <div className="h-6 w-48 bg-neutral-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-neutral-100 rounded animate-pulse mb-6" />
        <div className="h-[400px] bg-neutral-100 rounded-[10px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
              className="text-[20px] font-semibold text-[#0a0a0a] leading-tight bg-transparent border-b border-[#e5e5e5] outline-none px-0 py-0"
            />
          ) : (
            <h1 className="text-[20px] font-semibold text-[#0a0a0a] leading-tight">
              {title}
            </h1>
          )}
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-500">
            {status}
          </span>

          {/* Settings dropdown */}
          <div className="relative ml-auto" ref={settingsRef}>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="p-1.5 rounded-md text-neutral-400 hover:text-[#0a0a0a] hover:bg-neutral-100 transition-colors duration-150 cursor-pointer"
            >
              <SettingsIcon />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e5e5e5] rounded-lg shadow-sm py-1 z-50">
                <button
                  onClick={handleEditTitle}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#0a0a0a] hover:bg-neutral-50 transition-colors duration-150 cursor-pointer"
                >
                  Edit title
                </button>
                <button
                  onClick={handleArchive}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#0a0a0a] hover:bg-neutral-50 transition-colors duration-150 cursor-pointer"
                >
                  Archive project
                </button>
                {status === "draft" && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer"
                  >
                    Delete project
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] font-mono text-neutral-500">
            Created {new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {members.length > 0 && (
            <>
              <span className="text-[11px] text-[#e5e5e5]">|</span>
              <span className="text-[11px] font-mono text-neutral-500">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* Members row */}
        {members.length > 0 && (
          <div className="flex items-center gap-3 mt-4">
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
      <div className="inline-flex bg-neutral-100 rounded-lg p-0.5 mb-6">
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
        <div className="border border-[#e5e5e5] rounded-[10px] overflow-hidden h-[calc(100vh-320px)]">
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
    </div>
  );
}
