"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import VerifiedSeal from "@/components/VerifiedSeal";

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

/* ── Types ── */
type ProfileData = {
  displayName: string;
  slug?: string;
  tagline: string;
  bio: string;
  specialties: string[];
  hourlyRate: string;
  availability: string;
  avatarUrl: string;
  verified?: boolean;
};

type ProjectData = {
  id: string;
  title: string;
  description: string;
  status: string;
  memberCount: number;
  lastActivity: string;
};

type ConversationData = {
  projectId: string;
  projectName: string;
  lastMessage: string;
  lastSenderName: string;
  lastMessageAt: string;
};

type OpenJob = {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  budgetRange: string | null;
  timeline: string | null;
  createdAt: string;
  applied: boolean;
};

// Cap project lists on the overview so the page stays scannable. Anything
// past this gets a "View all (N) →" footer that drops to /dashboard/projects.
const MAX_PROJECTS_ON_OVERVIEW = 5;
const MAX_JOBS_ON_OVERVIEW = 4;

/* ── Profile completion calc ── */
function calcProfileCompletion(profile: ProfileData | null): number {
  if (!profile) return 0;
  const fields = [
    profile.displayName,
    profile.tagline,
    profile.bio,
    profile.specialties.length > 0,
    profile.hourlyRate,
    profile.avatarUrl,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

/* ── Relative time helper ── */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Shared overview sections ── */

// Renders the "Your projects" block: header with View-all link when the
// list is longer than the overview cap, dedupe-by-id, sliced to 5,
// row layout matching the rest of the dashboard. Used by both client
// and creator overviews so the project surface is identical.
function ProjectsSection({
  loading,
  projects,
  emptyState,
}: {
  loading: boolean;
  projects: ProjectData[];
  emptyState: React.ReactNode;
}) {
  const deduped = projects.filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
  );
  const visible = deduped.slice(0, MAX_PROJECTS_ON_OVERVIEW);
  const hasMore = deduped.length > MAX_PROJECTS_ON_OVERVIEW;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono uppercase text-text-muted">
          Your projects
        </p>
        {deduped.length > 0 && (
          <Link
            href="/dashboard/projects"
            className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            View all{hasMore ? ` (${deduped.length})` : ""}
          </Link>
        )}
      </div>
      {loading ? (
        <div className="border border-border rounded-[10px] p-6">
          <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
        </div>
      ) : deduped.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className="border border-border rounded-[10px] divide-y divide-border">
            {visible.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="flex items-center justify-between p-4 hover:bg-background-alt transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {project.title}
                  </p>
                  <p className="text-[11px] font-mono text-text-muted mt-0.5">
                    {project.memberCount} member
                    {project.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={project.status} />
                  <span className="text-[11px] font-mono text-text-muted">
                    {relativeTime(project.lastActivity)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && (
            <Link
              href="/dashboard/projects"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-text-primary hover:opacity-80 transition-opacity"
            >
              View all {deduped.length} projects
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

// "New on the job board" — fetches /api/jobs and renders the latest
// open briefs (capped). Hidden when there's nothing to show, so the
// section never appears as an empty placeholder. Creator-side only;
// clients have their own /dashboard/jobs page.
function JobBoardHighlight() {
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: OpenJob[] = d?.jobs ?? [];
        // Newest first — assume API already orders desc, but we sort
        // defensively so the overview never lies.
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setJobs(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (jobs.length === 0) return null;

  const visible = jobs.slice(0, MAX_JOBS_ON_OVERVIEW);
  const hasMore = jobs.length > MAX_JOBS_ON_OVERVIEW;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono uppercase text-text-muted">
          New on the job board
        </p>
        <Link
          href="/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
        >
          View all{hasMore ? ` (${jobs.length})` : ""}
        </Link>
      </div>
      <div className="border border-border rounded-[10px] divide-y divide-border">
        {visible.map((j) => (
          <Link
            key={j.id}
            href={`/jobs/${j.id}`}
            className="flex items-start gap-4 p-4 hover:bg-background-alt transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-text-primary truncate">
                {j.title}
              </p>
              {j.description && (
                <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                  {j.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-text-muted">
                {j.projectType && <span>{j.projectType}</span>}
                {j.budgetRange && <span>· {j.budgetRange}</span>}
                {j.timeline && <span>· {j.timeline}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {j.applied ? (
                <span className="text-[10px] font-mono uppercase tracking-wider text-positive bg-positive/10 px-2 py-0.5 rounded">
                  Applied
                </span>
              ) : (
                <span className="text-[11px] font-mono text-text-muted tabular-nums">
                  {relativeTime(j.createdAt)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    in_progress: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    completed: "bg-neutral-100 text-neutral-500",
    cancelled: "bg-neutral-100 text-neutral-400",
  };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[status] || "bg-neutral-100 text-neutral-500"}`}>
      {label}
    </span>
  );
}

/* ── Client Overview ── */
function ClientOverview({ name }: { name: string }) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/conversations").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, c]) => {
        setProjects(p);
        setConversations(c);
      })
      .catch((err) => console.error("Failed to load client data:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.03em]">
            {getGreeting()}, {name.split(" ")[0]}
          </h1>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
            Client
          </span>
        </div>
        <p className="text-[11px] font-mono text-text-muted mt-1">
          {formatDate()}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {/* Quick actions */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">
          Quick actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/browse"
            className="border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center mb-3 group-hover:bg-text-primary group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-text-primary">Browse gallery</p>
            <p className="text-[11px] text-text-muted mt-0.5">Explore verified coders</p>
          </Link>
          <Link
            href="/dashboard/teams/new"
            className="border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center mb-3 group-hover:bg-text-primary group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-text-primary">Build a team</p>
            <p className="text-[11px] text-text-muted mt-0.5">Assemble your dream squad</p>
          </Link>
          <Link
            href="/dashboard/jobs/new"
            className="border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center mb-3 group-hover:bg-text-primary group-hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.93 23.93 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-text-primary">Post a job</p>
            <p className="text-[11px] text-text-muted mt-0.5">Brief vetted creators — replies in hours.</p>
          </Link>
        </div>
      </div>

      {/* Active projects — capped to 5 with a "View all" footer when
          the user has more so the overview never becomes an
          infinite-scroll project list. */}
      <ProjectsSection
        loading={loading}
        projects={projects}
        emptyState={
          <div className="border border-border rounded-[10px] p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[13px] text-text-primary font-medium mb-1">Nothing in flight</p>
            <p className="text-[11px] text-text-muted mb-3">Start a project — track tasks, payments, and chat from one place.</p>
            <Link
              href="/browse"
              className="inline-flex px-4 py-2 bg-text-primary text-white text-[12px] font-medium rounded-md hover:bg-accent-hover transition-colors"
            >
              Find your first coder
            </Link>
          </div>
        }
      />

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-mono uppercase text-text-muted">
              Recent conversations
            </p>
            <Link
              href="/dashboard/inbox"
              className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="border border-border rounded-[10px] divide-y divide-border">
            {conversations.slice(0, 3).map((convo) => (
              <Link
                key={convo.projectId}
                href={`/dashboard/projects/${convo.projectId}`}
                className="flex items-center justify-between p-4 hover:bg-background-alt transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary truncate">{convo.projectName}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 truncate">
                    {convo.lastSenderName}: {convo.lastMessage}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-text-muted flex-shrink-0 ml-3">
                  {relativeTime(convo.lastMessageAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      </div>{/* end scrollable content */}
    </div>
  );
}

/* ── Creator Overview ── */
function CreatorOverview() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Creator";

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [portfolioCount, setPortfolioCount] = useState<number>(0);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [earningsCents, setEarningsCents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/portfolio").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/balance").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, portfolioData, projectData, balanceData]) => {
        setProfile(profileData);
        setPortfolioCount(Array.isArray(portfolioData) ? portfolioData.length : 0);
        setProjects(projectData);
        if (balanceData) setEarningsCents(balanceData.totalEarnedCents || 0);
      })
      .catch((err) => console.error("Failed to load creator data:", err))
      .finally(() => setLoading(false));
  }, []);

  const completion = calcProfileCompletion(profile);
  const isProfileIncomplete = completion < 100;

  if (loading) {
    return (
      <div className="w-full px-4 md:px-8 py-6">
        <div className="mb-8">
          <div className="h-6 w-48 bg-surface-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-surface-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-20 bg-surface-muted rounded-[10px] animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface-muted rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.03em]">
                {getGreeting()}, {userName.split(" ")[0]}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-muted bg-surface-muted px-1.5 py-0.5 rounded">
                <VerifiedSeal size="xs" />
                Creator
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[11px] font-mono text-text-muted">
                {formatDate()}
              </p>
              <Link
                href={profile?.slug ? `/coders/${profile.slug}` : "/dashboard/profile"}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Public profile
              </Link>
            </div>
          </div>
        </div>
        {/* Fade shadow at bottom of header */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {/* Profile completion card */}
      {isProfileIncomplete && (
        <div className="border border-border rounded-[10px] p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-medium text-text-primary">
                Complete your profile to get discovered
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {completion}% complete
              </p>
            </div>
            <Link
              href="/dashboard/profile"
              className="text-[12px] font-medium text-text-primary underline underline-offset-2"
            >
              Complete profile
            </Link>
          </div>
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-text-primary rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick stats row -- folder shape cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Projects", value: String(projects.length), href: "/dashboard/projects" },
          { label: "Portfolio items", value: String(portfolioCount), href: "/dashboard/portfolio" },
          { label: "Profile views", value: "\u2014", href: null },
          { label: "Earnings", value: earningsCents > 0 ? `$${(earningsCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}` : "\u2014", href: "/dashboard/earnings" },
        ].map((stat) => {
          const folderCard = (hoverClass: string = "") => (
            <div className={`relative ${hoverClass}`}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none" fill="none">
                <path
                  d="M4 16 C4 7 4 4 4 4 C4 1.5 6 0 8 0 L56 0 C60 0 62 1 64 4 L70 13 C72 16 75 17 78 17 L190 17 C194 17 196 19 196 22 L196 110 C196 114 194 116 190 116 L10 116 C6 116 4 114 4 110 Z"
                  className="stroke-border fill-none transition-colors"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="relative pt-6 pb-3 px-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">{stat.label}</p>
                <p className="text-[22px] font-semibold text-text-primary tabular-nums">{stat.value}</p>
              </div>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="group">
              {folderCard("[&_path]:group-hover:stroke-border-hover")}
            </Link>
          ) : (
            <div key={stat.label}>{folderCard()}</div>
          );
        })}
      </div>

      {/* Getting started checklist for new/incomplete profiles */}
      {isProfileIncomplete && (
        <div className="border border-border rounded-[10px] p-5 mb-8">
          <h3 className="text-[14px] font-medium text-text-primary mb-3">Get started</h3>
          <div className="space-y-3">
            {[
              {
                href: "/dashboard/profile",
                done: !!(profile?.displayName && profile?.bio && profile?.tagline),
                title: "Complete your profile",
                desc: "Add bio, specialties, rate, and social links",
              },
              {
                href: "/dashboard/portfolio",
                done: portfolioCount > 0,
                title: "Add your first project",
                desc: "Upload portfolio work with live previews and assets",
              },
              {
                href: "/browse",
                done: false,
                title: "Browse the gallery",
                desc: "See how other verified coders present their work",
              },
            ].map((step, i) => (
              <Link key={i} href={step.href} className="flex items-center gap-3 group">
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                  step.done
                    ? "border-text-primary bg-text-primary"
                    : "border-border group-hover:border-text-primary"
                }`}>
                  {step.done ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">{i + 1}</span>
                  )}
                </div>
                <div>
                  <p className={`text-[13px] group-hover:underline ${step.done ? "text-text-muted line-through" : "text-text-primary"}`}>
                    {step.title}
                  </p>
                  <p className="text-[11px] text-text-muted">{step.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active projects — capped + paginated link, same as client view. */}
      <ProjectsSection
        loading={false}
        projects={projects}
        emptyState={
          <div className="border border-border rounded-[10px] p-6 text-center">
            <p className="text-[13px] text-text-muted">No active projects yet</p>
            <Link href="/browse" className="text-[12px] text-text-primary underline underline-offset-2 mt-1 inline-block">
              Browse the gallery to get discovered
            </Link>
          </div>
        }
      />

      {/* New on the job board — pulls the latest open briefs so creators
          see fresh opportunities without leaving the overview. */}
      <JobBoardHighlight />

      </div>{/* end scrollable content */}
    </div>
  );
}

/* ── Main Page ── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const rawRole = (session?.user as any)?.role as string | undefined;
  const role = rawRole === "client" ? "client" : rawRole ? "creator" : undefined;
  const name = session?.user?.name || "there";

  if (status === "loading") {
    return (
      <div className="w-full px-4 md:px-8 py-6">
        <div className="mb-8">
          <div className="h-6 w-48 bg-surface-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-surface-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-20 bg-surface-muted rounded-[10px] animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface-muted rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (role === "client") {
    return <ClientOverview name={name} />;
  }

  // Coders and admins get the creator dashboard
  return <CreatorOverview />;
}
