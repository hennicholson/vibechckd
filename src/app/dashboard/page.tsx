"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { coders, featuredCoders } from "@/lib/mock-data";
import Badge from "@/components/Badge";
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

const activityItems = [
  { text: "Sara Chen submitted a deliverable", time: "2h ago" },
  { text: "New message in vibechckd Marketing Site", time: "5h ago" },
  { text: "Task 'Design hero section' marked complete", time: "1d ago" },
];

/* ── Client Overview ── */
function ClientOverview({ name }: { name: string }) {
  const recommendedCoders = featuredCoders.slice(0, 4);

  return (
    <div className="max-w-3xl px-8 py-6">
      {/* Client label */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
          <VerifiedSeal size="xs" />
          Client Dashboard
        </span>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.03em]">
          Find your next team
        </h1>
        <p className="text-[12px] font-mono text-text-muted mt-1">
          {formatDate()}
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">
          Quick actions
        </p>
        <div className="grid grid-cols-3 gap-3">
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
          <div className="border border-border rounded-[10px] p-4 opacity-50 cursor-not-allowed">
            <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-text-primary">Post a project</p>
            <p className="text-[11px] text-text-muted mt-0.5">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Active projects */}
      {/* Active projects */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">
          Your projects
        </p>
        <div className="border border-border rounded-[10px] p-6 text-center">
          <p className="text-[13px] text-text-muted">No projects yet</p>
          <Link href="/dashboard/teams/new" className="text-[12px] text-text-primary underline underline-offset-2 mt-1 inline-block">
            Build your first team
          </Link>
        </div>
      </div>

      {/* Recommended coders */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-mono uppercase text-text-muted">
            Recommended coders
          </p>
          <Link
            href="/browse"
            className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="border border-border rounded-[10px] divide-y divide-border">
          {recommendedCoders.map((coder) => (
            <Link
              key={coder.id}
              href={`/coders/${coder.slug}`}
              className="flex items-center justify-between p-4 hover:bg-background-alt transition-colors first:rounded-t-[10px] last:rounded-b-[10px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center text-[11px] font-medium text-text-muted overflow-hidden">
                  {coder.avatarUrl ? (
                    <img
                      src={coder.avatarUrl}
                      alt={coder.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    coder.displayName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-text-primary">
                      {coder.displayName}
                    </p>
                    {coder.verified && <Badge variant="verified" />}
                  </div>
                  <p className="text-[11px] font-mono text-text-muted mt-0.5">
                    {coder.title} &middot; {coder.hourlyRate}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-text-muted">
                View profile
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hire CTA */}
      <div className="border border-border rounded-[10px] p-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-text-primary">
            Ready to hire?
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Browse our verified talent pool and start building today.
          </p>
        </div>
        <Link
          href="/browse"
          className="px-4 py-2 bg-text-primary text-white text-[12px] font-medium rounded-md hover:bg-accent-hover transition-colors flex-shrink-0"
        >
          Hire a coder
        </Link>
      </div>
    </div>
  );
}

/* ── Creator Overview ── */
function CreatorOverview() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Creator";
  const creator = coders.find(c => c.displayName === userName) || null;

  const portfolioItemCount = creator?.portfolio.length || 0;
  const totalAssets = creator?.portfolio.reduce(
    (sum, item) => sum + item.assets.length,
    0
  ) || 0;

  return (
    <div className="max-w-3xl px-8 py-6">
      {/* Creator label */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-text-muted">
          <VerifiedSeal size="xs" />
          Creator Dashboard
        </span>
      </div>

      {/* Greeting */}
      <div className="mb-2">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.03em]">
          {getGreeting()}, {userName.split(" ")[0]}
        </h1>
        <p className="text-[12px] font-mono text-text-muted mt-1">
          {formatDate()}
        </p>
      </div>

      {/* Public profile link */}
      <div className="mb-8">
        <Link
          href={creator ? `/coders/${creator.slug}` : "/dashboard/profile"}
          className="inline-flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors group"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View public profile
          <span className="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </Link>
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
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Projects", value: "1" },
          { label: "Portfolio items", value: String(portfolioItemCount) },
          { label: "Total assets", value: String(totalAssets) },
          { label: "Profile views", value: "\u2014" },
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

      {/* Getting started checklist for new creators */}
      {portfolioItemCount === 0 && (
        <div className="border border-border rounded-[10px] p-5 mb-8">
          <h3 className="text-[14px] font-medium text-text-primary mb-3">Get started</h3>
          <div className="space-y-3">
            <Link href="/dashboard/profile" className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 group-hover:border-text-primary transition-colors">
                <span className="text-[10px] font-mono text-text-muted">1</span>
              </div>
              <div>
                <p className="text-[13px] text-text-primary group-hover:underline">Complete your profile</p>
                <p className="text-[11px] text-text-muted">Add bio, specialties, rate, and social links</p>
              </div>
            </Link>
            <Link href="/dashboard/portfolio" className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 group-hover:border-text-primary transition-colors">
                <span className="text-[10px] font-mono text-text-muted">2</span>
              </div>
              <div>
                <p className="text-[13px] text-text-primary group-hover:underline">Add your first project</p>
                <p className="text-[11px] text-text-muted">Upload portfolio work with live previews and assets</p>
              </div>
            </Link>
            <Link href="/browse" className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 group-hover:border-text-primary transition-colors">
                <span className="text-[10px] font-mono text-text-muted">3</span>
              </div>
              <div>
                <p className="text-[13px] text-text-primary group-hover:underline">Browse the gallery</p>
                <p className="text-[11px] text-text-muted">See how other verified coders present their work</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Your portfolio quick view */}
      {portfolioItemCount > 0 && creator && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-mono uppercase text-text-muted">Your portfolio</p>
            <Link href="/dashboard/portfolio" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Manage &rarr;
            </Link>
          </div>
          <div className="border border-border rounded-[10px] divide-y divide-border">
            {creator.portfolio.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{item.title}</p>
                  <p className="text-[11px] font-mono text-text-muted mt-0.5">
                    {item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active projects */}
      <div className="mb-8">
        <p className="text-[11px] font-mono uppercase text-text-muted mb-3">Projects</p>
        <div className="border border-border rounded-[10px] p-6 text-center">
          <p className="text-[13px] text-text-muted">No active projects yet</p>
          <Link href="/browse" className="text-[12px] text-text-primary underline underline-offset-2 mt-1 inline-block">
            Browse the gallery to get discovered
          </Link>
        </div>
      </div>
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
      <div className="max-w-3xl px-8 py-6">
        <div className="mb-8">
          <div className="h-6 w-48 bg-surface-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-surface-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-20 bg-surface-muted rounded-[10px] animate-pulse mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
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
  if (role === "creator") {
    return <CreatorOverview />;
  }

  // Fallback — show creator dashboard for any authenticated user
  return <CreatorOverview />;
}
