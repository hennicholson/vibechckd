"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import VerifiedSeal from "@/components/VerifiedSeal";
import {
  navItems,
  adminItem,
  uiRole,
  isItemActive,
  type NavItem,
} from "@/lib/dashboard-nav";


export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const rawRole = (session?.user as any)?.role as string | undefined;
  // Track userId, not the full user object — SessionProvider can swap object
  // identity on every render, which made this effect re-fire on each parent
  // re-render and re-hit /api/profile on every nav click.
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId || rawRole === "client") return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.slug) setProfileSlug(data.slug); })
      .catch(() => {});
  }, [userId, rawRole]);
  const role = uiRole(rawRole);

  // When role is undefined (typically a brief render before the session
  // hydrates) we DELIBERATELY render no items rather than leaking every
  // role's nav at once. The "real" role-aware list lights up as soon as
  // SessionProvider's initial server-rendered session takes over.
  const filteredItems: NavItem[] = role
    ? [
        ...navItems.filter((item) => item.roles.includes(role)),
        ...(rawRole === "admin" ? [adminItem] : []),
      ]
    : [];

  const isActive = (item: NavItem) => isItemActive(item, pathname);

  // Select up to 5 items for mobile bottom nav (Overview, Projects, Inbox, Settings + role-specific)
  const mobileItems = filteredItems.filter((item) =>
    ["/dashboard", "/dashboard/projects", "/dashboard/inbox", "/dashboard/settings", "/dashboard/profile", "/dashboard/portfolio", "/dashboard/earnings", "/dashboard/company"].includes(item.href)
  ).slice(0, 5);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-[48px] flex items-center justify-between px-4">
        <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
          vibechckd
          <VerifiedSeal size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted">
            {session?.user?.name?.charAt(0) || "?"}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[56px]">
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive(item)
                  ? "text-text-primary"
                  : "text-text-muted active:text-text-primary"
              }`}
            >
              {item.icon}
              <span className={`text-[10px] ${isActive(item) ? "font-medium" : ""}`}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar — collapses to icons-only between md (768px) and
          nav (1100px) so the dashboard reads cleanly inside the Whop iframe
          which often renders at 800–1100px. Above nav: full 200px rail with
          labels. Item `title` attrs surface the label on hover at compact
          widths. */}
      <aside className="hidden md:flex flex-col w-[52px] nav:w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen transition-[width] duration-150">
        {/* Logo */}
        <div className="px-3 nav:px-4 h-[48px] flex items-center justify-center nav:justify-start border-b border-border">
          <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1" title="vibechckd">
            <span className="hidden nav:inline">vibechckd</span>
            <VerifiedSeal size="sm" />
          </Link>
        </div>

        {/* Nav */}
        <div className="px-2 nav:px-3 py-3 space-y-0.5 flex-1">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-2 px-2 max-nav:px-0 max-nav:justify-center py-1.5 rounded-md text-[13px] transition-colors ${
                isActive(item)
                  ? "text-text-primary font-medium bg-surface-muted"
                  : "text-text-muted hover:text-text-primary hover:bg-background-alt"
              }`}
            >
              {item.icon}
              <span className="flex-1 max-nav:hidden">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User */}
        <div className="px-2 nav:px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 px-1 nav:px-2 mb-2 max-nav:justify-center">
            <div
              className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted"
              title={session?.user?.name || undefined}
            >
              {session?.user?.name?.charAt(0) || "?"}
            </div>
            <div className="hidden nav:flex flex-col min-w-0">
              <span className="text-[12px] text-text-primary truncate">{session?.user?.name || "User"}</span>
              <span className="text-[10px] font-mono text-text-muted">
                {rawRole === "admin" ? (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Admin
                  </span>
                ) : role === "creator" ? (
                  <span className="inline-flex items-center gap-1">
                    <VerifiedSeal size="xs" />
                    Creator
                  </span>
                ) : role === "client" ? (
                  <span className="inline-flex items-center gap-1">
                    Client
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          {profileSlug && (
            <Link
              href={`/coders/${profileSlug}`}
              className="hidden nav:block px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              View public profile
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="w-full text-left max-nav:text-center px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="hidden nav:inline">Sign out</span>
            <span className="nav:hidden inline-flex items-center justify-center w-full" aria-hidden>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </span>
            <span className="sr-only nav:hidden">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
