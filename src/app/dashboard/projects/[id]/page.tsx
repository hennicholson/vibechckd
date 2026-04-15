"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import ProjectChat from "@/components/projects/ProjectChat";
import { mockProject } from "@/lib/mock-data";

type Tab = "chat" | "details";

const tabs: { key: Tab; label: string }[] = [
  { key: "chat", label: "Chat" },
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

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProject(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Fallback to mock for demo project "1"
  const title = project?.title || (projectId === "1" ? mockProject.title : "Project");
  const description = project?.description || (projectId === "1" ? mockProject.description : "");
  const status = project?.status || "active";
  const members = project?.members || [];
  const createdAt = project?.createdAt || new Date().toISOString();

  if (loading) {
    return (
      <div className="max-w-3xl px-8 py-6">
        <div className="h-6 w-48 bg-surface-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-surface-muted rounded animate-pulse mb-6" />
        <div className="h-[400px] bg-surface-muted rounded-[10px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-[20px] font-semibold text-text-primary leading-tight">
            {title}
          </h1>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-muted text-text-muted">
            {status}
          </span>
        </div>
        <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] font-mono text-text-muted">
            Created {new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {members.length > 0 && (
            <>
              <span className="text-[11px] text-border">|</span>
              <span className="text-[11px] font-mono text-text-muted">
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
                <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    m.name.charAt(0)
                  )}
                </div>
                <span className="text-[12px] text-text-secondary">{m.name}</span>
                <span className="text-[10px] font-mono text-text-muted">({m.role})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segmented Control */}
      <div className="inline-flex bg-surface-muted rounded-lg p-0.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
              activeTab === tab.key
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="project-tab"
                className="absolute inset-0 bg-background border border-border rounded-md"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "chat" && (
        <div className="border border-border rounded-[10px] overflow-hidden h-[calc(100vh-320px)]">
          <ProjectChat projectId={projectId} />
        </div>
      )}
      {activeTab === "details" && (
        <div className="border border-border rounded-[10px] p-5">
          <p className="text-[14px] text-text-secondary leading-[1.6]">{description}</p>
          {members.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-[11px] font-mono uppercase text-text-muted mb-3">Team</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted overflow-hidden">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        m.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">{m.name}</p>
                      <p className="text-[11px] text-text-muted">{m.role}</p>
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
