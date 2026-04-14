"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import TeamRoster from "@/components/projects/TeamRoster";
import TaskList from "@/components/projects/TaskList";
import DeliverablesList from "@/components/projects/DeliverablesList";
import ProjectChat from "@/components/projects/ProjectChat";
import { mockProject, coders, ProjectStatus } from "@/lib/mock-data";

type Tab = "tasks" | "deliverables" | "chat";

const tabs: { key: Tab; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "deliverables", label: "Deliverables" },
  { key: "chat", label: "Chat" },
];

const STATUS_DISPLAY: Record<ProjectStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "text-text-primary bg-surface-muted",
  },
  draft: {
    label: "Draft",
    className: "text-text-muted bg-surface-muted",
  },
  completed: {
    label: "Completed",
    className: "text-text-muted bg-surface-muted",
  },
};

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("tasks");

  const teamMembers = mockProject.teamMemberIds
    .map((id) => coders.find((c) => c.id === id))
    .filter(Boolean) as (typeof coders)[number][];

  const handleViewDeliverables = () => setActiveTab("deliverables");

  const statusConfig = STATUS_DISPLAY[mockProject.status];

  return (
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Left sidebar */}
        <TeamRoster
          projectName={mockProject.title}
          members={teamMembers}
          onViewDeliverables={handleViewDeliverables}
        />

        {/* Main content */}
        <div className="flex-1 px-8 py-6 max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-[20px] font-semibold text-text-primary leading-tight">
                {mockProject.title}
              </h1>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">
              {mockProject.description}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] font-mono text-text-muted">
                Created {new Date(mockProject.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="text-[11px] text-border">|</span>
              <span className="text-[11px] font-mono text-text-muted">
                {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
              </span>
            </div>
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
                    layoutId="segment-indicator"
                    className="absolute inset-0 bg-background border border-border rounded-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "tasks" && <TaskList tasks={mockProject.tasks} />}
          {activeTab === "deliverables" && (
            <DeliverablesList deliverables={mockProject.deliverables} />
          )}
          {activeTab === "chat" && (
            <div className="border border-border rounded-[10px] overflow-hidden h-[calc(100vh-280px)]">
              <ProjectChat projectId={projectId} />
            </div>
          )}
        </div>
      </div>
  );
}
