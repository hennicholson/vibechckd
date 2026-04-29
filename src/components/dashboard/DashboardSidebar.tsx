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

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-4 h-[48px] flex items-center border-b border-border">
          <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
            vibechckd
            <VerifiedSeal size="sm" />
          </Link>
        </div>

        {/* Nav */}
        <div className="px-3 py-3 space-y-0.5 flex-1">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                isActive(item)
                  ? "text-text-primary font-medium bg-surface-muted"
                  : "text-text-muted hover:text-text-primary hover:bg-background-alt"
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted">
              {session?.user?.name?.charAt(0) || "?"}
            </div>
            <div className="flex flex-col min-w-0">
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
              className="block px-2 py-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              View public profile
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
