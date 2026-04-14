"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { mockProject } from "@/lib/mock-data";

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  status: "Active" | "Draft";
  memberCount: number;
};

const projects: ProjectRow[] = [
  {
    id: "proj-1",
    title: mockProject.title,
    description: mockProject.description,
    status: "Active",
    memberCount: mockProject.teamMemberIds.length,
  },
  {
    id: "proj-2",
    title: "Personal Portfolio Site",
    description: "A minimal portfolio site with project showcase, blog, and contact form.",
    status: "Draft",
    memberCount: 1,
  },
  {
    id: "proj-3",
    title: "E-Commerce Redesign",
    description: "Full redesign of the storefront with improved checkout flow and mobile experience.",
    status: "Active",
    memberCount: 4,
  },
];

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
      {projects.length === 0 ? (
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
        <div className="border border-border rounded-[10px] divide-y divide-border">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/dashboard/projects/1`)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-background-alt transition-colors duration-150 cursor-pointer first:rounded-t-[10px] last:rounded-b-[10px]"
            >
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <span className="text-[13px] font-medium text-text-primary font-body">
                    {project.title}
                  </span>
                  <span
                    className={`text-[11px] font-mono ${
                      project.status === "Active"
                        ? "text-text-primary"
                        : "text-text-muted"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="text-[12px] text-text-muted font-body truncate">
                  {project.description}
                </p>
              </div>

              {/* Member count */}
              <div className="flex items-center gap-1 text-text-muted flex-shrink-0">
                <UsersIcon />
                <span className="text-[11px] font-mono">{project.memberCount}</span>
              </div>

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
