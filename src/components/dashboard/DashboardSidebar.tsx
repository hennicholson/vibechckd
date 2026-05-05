"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import VerifiedSeal from "@/components/VerifiedSeal";
import { useUnreadCount } from "@/lib/use-unread-count";
import {
  navItems,
  adminItem,
  uiRole,
  isItemActive,
  type NavItem,
  type DashboardRole,
} from "@/lib/dashboard-nav";

// Tiny wrapper that overlays an unread dot on the icon of nav items
// the user wants to know are "live" — currently just Inbox. The dot
// sits in the top-right, never grows past 6×6, and pulses softly so
// it draws the eye without being noisy.
function NavIconWithBadge({
  icon,
  showBadge,
}: {
  icon: React.ReactNode;
  showBadge: boolean;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {icon}
      {showBadge && (
        <span
          aria-label="Unread messages"
          className="absolute -top-1 -right-1 inline-flex w-2 h-2 rounded-full bg-text-primary ring-2 ring-background"
        />
      )}
    </span>
  );
}


// Inline quick-action panel that expands beneath the active nav item.
// Hidden in icon-only sidebar mode (sub-`nav` breakpoint). Subtle motion:
// height + opacity from 0 to auto, fast spring, no layout jank.
export function QuickActions({
  item,
  active,
  viewerRole,
}: {
  item: NavItem;
  active: boolean;
  viewerRole: DashboardRole | undefined;
}) {
  const actions = (item.quickActions || []).filter(
    (a) => !a.roles || (viewerRole && a.roles.includes(viewerRole))
  );
  if (actions.length === 0) return null;

  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.ul
          key={`qa-${item.href}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            opacity: { duration: 0.12 },
            height: { type: "spring", stiffness: 480, damping: 36 },
          }}
          className="hidden nav:block overflow-hidden ml-7 mt-0.5 mb-1 border-l border-border"
          aria-label={`${item.label} quick actions`}
        >
          {actions.map((qa) => (
            <li key={qa.href}>
              <Link
                href={qa.href}
                className="block pl-3 pr-2 py-1 text-[12px] text-text-muted hover:text-text-primary transition-colors"
              >
                {qa.label}
              </Link>
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [vetted, setVetted] = useState<boolean>(false);
  const unread = useUnreadCount();
  const rawRole = (session?.user as any)?.role as string | undefined;
  // Track userId, not the full user object — SessionProvider can swap object
  // identity on every render, which made this effect re-fire on each parent
  // re-render and re-hit /api/profile on every nav click.
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId || rawRole === "client") return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.slug) setProfileSlug(data.slug);
        if (data?.vetted) setVetted(true);
      })
      .catch(() => {});
  }, [userId, rawRole]);
  const role = uiRole(rawRole);

  // When role is undefined (typically a brief render before the session
  // hydrates) we DELIBERATELY render no items rather than leaking every
  // role's nav at once. The "real" role-aware list lights up as soon as
  // SessionProvider's initial server-rendered session takes over.
  const filteredItems: NavItem[] = role
    ? [
        ...navItems
          .filter((item) => item.roles.includes(role))
          // Hide the standalone Application nav item once the creator is
          // vetted — the link still lives in Settings → Application so
          // they can review it, but it shouldn't crowd the rail.
          .filter((item) => !(vetted && item.href === "/dashboard/application")),
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
      <aside className="hidden md:flex flex-col w-[52px] nav:w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen transition-[width] duration-150 bg-background z-30">
        {/* Logo — flex-shrink-0 + min-w-0 so the wordmark + verified seal
            never spill past the rail's right edge at any viewport. */}
        <div className="px-3 nav:px-4 h-[48px] flex items-center justify-center nav:justify-start border-b border-border flex-shrink-0 min-w-0">
          <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1 min-w-0 max-w-full" title="vibechckd">
            <span className="hidden nav:inline truncate">vibechckd</span>
            <VerifiedSeal size="sm" />
          </Link>
        </div>

        {/* Scrollable middle — primary nav + per-page quickActions. The
            wrapper is flex-1 min-h-0 overflow-y-auto so any combination
            of nav items + expanded actions can scroll within the rail
            without ever pushing the user footer past the viewport.
            scrollbar-none keeps the chrome clean while still letting
            mouse/wheel scroll work. */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
          <div className="px-2 nav:px-3 py-3 space-y-0.5">
          {filteredItems.map((item) => {
            const active = isActive(item);
            const isInbox = item.href === "/dashboard/inbox";
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`group relative flex items-center justify-center gap-2 px-0 nav:justify-start nav:px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                    active
                      ? "text-text-primary font-medium bg-surface-muted"
                      : "text-text-muted hover:text-text-primary hover:bg-background-alt"
                  }`}
                >
                  {isInbox ? (
                    <NavIconWithBadge icon={item.icon} showBadge={unread > 0} />
                  ) : (
                    item.icon
                  )}
                  <span className="hidden nav:inline flex-1">{item.label}</span>
                  {isInbox && unread > 0 && (
                    <span className="hidden nav:inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-text-primary text-background text-[10px] font-mono tabular-nums">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                  {/* Hover tooltip in icon-only mode (sub-`nav` breakpoint) —
                      small dark pill with arrow appears to the right of the
                      icon. Hidden when full labels are visible. */}
                  <span className="nav:hidden pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-[11px] font-medium text-background opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-md">
                    {item.label}
                    <span
                      aria-hidden
                      className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-text-primary"
                    />
                  </span>
                </Link>
                <QuickActions item={item} active={active} viewerRole={role} />
              </div>
            );
          })}
          </div>
        </div>

        {/* Footer — Profile entry (avatar + name → /dashboard/profile or
            /dashboard/company), public-profile sub-link for creators
            with a slug, sign-out at the bottom. flex-shrink-0 so the
            footer never collapses, even on short viewports. */}
        <div className="px-2 nav:px-3 py-3 border-t border-border flex-shrink-0">
          <Link
            href={role === "client" ? "/dashboard/company" : "/dashboard/profile"}
            title={`${session?.user?.name || "Your profile"} — open profile`}
            className="group flex items-center justify-center nav:justify-start gap-2 px-1 nav:px-2 py-1 rounded-md hover:bg-background-alt transition-colors"
          >
            <div
              className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted overflow-hidden flex-shrink-0"
              title={session?.user?.name || undefined}
            >
              {session?.user?.name?.charAt(0) || "?"}
            </div>
            <div className="hidden nav:flex flex-col min-w-0 flex-1">
              <span className="text-[12px] text-text-primary truncate group-hover:text-text-primary transition-colors">
                {session?.user?.name || "Your profile"}
              </span>
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
                  "Client"
                ) : null}
              </span>
            </div>
            {/* Tiny chevron at expanded width as the affordance cue */}
            <svg
              className="hidden nav:block w-3 h-3 text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {profileSlug && (
            <Link
              href={`/coders/${profileSlug}`}
              className="hidden nav:flex items-center gap-1 px-2 py-1 mt-0.5 text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              View public profile
              <svg className="w-2.5 h-2.5 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="w-full text-center nav:text-left px-2 py-1.5 mt-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
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
