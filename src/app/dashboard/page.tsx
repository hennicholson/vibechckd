"use client";

import Link from "next/link";
import { mockProject } from "@/lib/mock-data";
import Badge from "@/components/Badge";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const activityItems = [
  { text: "Sara Chen submitted a deliverable", time: "2h ago" },
  { text: "New message in vibechckd Marketing Site", time: "5h ago" },
  { text: "Task 'Design hero section' marked complete", time: "1d ago" },
];

export default function DashboardPage() {
  const inProgressCount = mockProject.tasks.filter(
    (t) => t.status === "in_progress"
  ).length;
  const doneCount = mockProject.tasks.filter((t) => t.status === "done").length;

  return (
    <div className="max-w-3xl px-8 py-6">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-text-primary">
          {getGreeting()}, Creator
        </h1>
        <p className="text-[12px] font-mono text-text-muted mt-1">
          {formatDate()}
        </p>
      </div>

      {/* Profile completion card */}
      <div className="border border-border rounded-[10px] p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] text-text-primary">
            Complete your profile to get discovered
          </p>
          <Link
            href="/dashboard/profile"
            className="text-[12px] font-medium text-text-primary underline underline-offset-2"
          >
            Complete profile
          </Link>
        </div>
        <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-text-primary rounded-full"
            style={{ width: "30%" }}
          />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Projects", value: "1" },
          { label: "Profile views", value: "\u2014" },
          { label: "Earnings", value: "\u2014" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-border rounded-[10px] p-4"
          >
            <p className="text-[11px] font-mono uppercase text-text-muted mb-1">
              {stat.label}
            </p>
            <p className="text-[24px] font-semibold text-text-primary">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active projects */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">
          Active projects
        </p>
        <div className="border border-border rounded-[10px] divide-y divide-border">
          <Link
            href="/dashboard/projects/1"
            className="flex items-center justify-between p-4 hover:bg-background-alt transition-colors rounded-[10px]"
          >
            <div>
              <p className="text-[13px] font-medium text-text-primary">
                {mockProject.title}
              </p>
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                {doneCount}/{mockProject.tasks.length} tasks done
                {inProgressCount > 0 &&
                  ` \u00B7 ${inProgressCount} in progress`}
              </p>
            </div>
            <Badge variant="pending" />
          </Link>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">
          Recent
        </p>
        <div className="space-y-0">
          {activityItems.map((item, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between py-2.5"
            >
              <p className="text-[13px] text-text-primary">{item.text}</p>
              <span className="text-[11px] font-mono text-text-muted ml-4 flex-shrink-0">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
