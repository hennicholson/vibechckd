"use client";

/**
 * BrowseSidebar — Left rail for the /browse page.
 *
 * Sized + styled to match DashboardSidebar exactly so the product feels unified.
 * Adds a "Filter" sub-section below the primary nav for specialty filtering.
 *
 *  Width:           200px  (matches DashboardSidebar)
 *  Logo:            14px   semibold + VerifiedSeal sm
 *  Nav items:       13px   px-2 py-1.5 rounded-md gap-2  (active = bg-surface-muted)
 *  FILTER label:    10px   font-mono uppercase tracking-wider
 *  Filter buttons:  same shape as nav items — list-item treatment, not pills
 *  User footer:     6×6 avatar, 13px name, 12px footer links
 *
 * Responsive: hidden < md; parent renders mobile top bar + drawer instead.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import VerifiedSeal from "@/components/VerifiedSeal";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";
import {
  navItems,
  adminItem,
  uiRole,
  isItemActive,
} from "@/lib/dashboard-nav";

type Filter = "all" | Specialty;

interface BrowseSidebarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<string, number>;
}

function NavItem({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  // Below `nav` (1100px) the rail collapses to icons-only and the label is
  // hidden — frees ~150px for content. Inverted to `nav:` only because the
  // `max-{breakpoint}` variant from Tailwind v4 custom theme breakpoints
  // wasn't being applied reliably; `nav:` (min-width) compiles correctly.
  const label = typeof children === "string" ? children : undefined;
  return (
    <Link
      href={href}
      title={label}
      className={`group relative flex items-center justify-center gap-2 px-0 py-1.5 nav:justify-start nav:px-2 rounded-md text-[13px] transition-colors ${
        active
          ? "text-text-primary font-medium bg-surface-muted"
          : "text-text-muted hover:text-text-primary hover:bg-background-alt"
      }`}
    >
      {icon}
      <span className="hidden nav:inline flex-1">{children}</span>
      {/* Hover tooltip — only rendered when the rail is icon-only (sub-`nav`
          breakpoint). Sits to the right of the icon with a subtle arrow,
          opacity-fades in via group-hover. `pointer-events-none` so it
          doesn't swallow clicks meant for the link beneath. */}
      <span
        className="nav:hidden pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-[11px] font-medium text-background opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-md"
      >
        {label}
        <span
          aria-hidden
          className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-text-primary"
        />
      </span>
    </Link>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
        active
          ? "text-text-primary font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-text-primary before:rounded-full"
          : "text-text-muted hover:text-text-primary hover:bg-background-alt"
      }`}
    >
      <span className="truncate">
        {label}
        {count !== undefined && (
          <span className={`ml-1 font-mono tabular-nums ${active ? "text-text-muted" : "text-text-muted/70"}`}>
            ({count})
          </span>
        )}
      </span>
    </button>
  );
}

export default function BrowseSidebar({ filter, onFilterChange, counts }: BrowseSidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  const role = uiRole(rawRole);

  const filteredNav = role
    ? [
        ...navItems.filter((item) => item.roles.includes(role)),
        ...(rawRole === "admin" ? [adminItem] : []),
      ]
    : navItems.filter((item) => item.href === "/browse");

  // Whop SSO users have no passwordHash → can't sign in directly at
  // vibechckd.cc/login. Surface a "Set a password" link so they know there's
  // a way to escape the iframe. /api/settings already returns these flags.
  // Once we've fetched once for a given user we don't refetch on every nav —
  // tied to userId (a stable primitive) instead of the session.user object.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [whopLinked, setWhopLinked] = useState(false);
  const userId = session?.user?.id;
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (typeof d?.hasPassword === "boolean") setHasPassword(d.hasPassword);
        if (typeof d?.whopLinked === "boolean") setWhopLinked(d.whopLinked);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, userId]);
  const showSetPassword = whopLinked && hasPassword === false;

  return (
    <aside className="hidden md:flex flex-col w-[52px] nav:w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen bg-background transition-[width] duration-150 z-30">
      {/* Logo — at compact widths show only the verified seal so the rail
          stays tight; full wordmark returns at nav (1100px+). */}
      <div className="px-3 nav:px-4 h-[48px] flex items-center justify-center nav:justify-start border-b border-border">
        <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1" title="vibechckd">
          <span className="hidden nav:inline">vibechckd</span>
          <VerifiedSeal size="sm" />
        </Link>
      </div>

      {/* Primary nav — same items, ordering, and role-gating as the dashboard
          rail so transitions /whop ↔ /dashboard don't visually jolt. */}
      <div className="px-2 nav:px-3 py-3 space-y-0.5">
        {filteredNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            active={isItemActive(item, pathname)}
            icon={item.icon}
          >
            {item.label}
          </NavItem>
        ))}
      </div>

      {/* Filter section — full list visible only above nav. At compact widths
          the BrowseFilterPills row at the top of the page does the filtering. */}
      <div className="hidden nav:block px-3 pt-2 pb-1 border-t border-border mt-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted px-2 mb-1 mt-2">
          Filter
        </p>
        <div className="space-y-0.5">
          <FilterButton
            active={filter === "all"}
            label="All coders"
            onClick={() => onFilterChange("all")}
          />
          {SPECIALTIES.map((s) => (
            <FilterButton
              key={s}
              active={filter === s}
              label={SPECIALTY_LABELS[s]}
              count={counts[s] ?? 0}
              onClick={() => onFilterChange(s)}
            />
          ))}
        </div>
      </div>

      {/* User footer — matches DashboardSidebar's footer shape so the rail
          looks identical on /browse, /whop, and /dashboard/*. The only extras
          are the role-aware "Set a password" prompt for cookieless Whop users. */}
      <div className="mt-auto border-t border-border">
        {status === "authenticated" && session?.user ? (
          <div className="px-2 nav:px-3 py-3">
            <div className="flex items-center justify-center gap-2 px-1 nav:px-2 nav:justify-start mb-2">
              <div
                className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted flex-shrink-0"
                title={session.user.name || undefined}
              >
                {session.user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="hidden nav:flex flex-col min-w-0">
                <span className="text-[12px] text-text-primary truncate">{session.user.name}</span>
                <span className="text-[10px] font-mono text-text-muted">
                  {role === "creator" ? (
                    <span className="inline-flex items-center gap-1">
                      <VerifiedSeal size="xs" />
                      Creator
                    </span>
                  ) : role === "client" ? (
                    "Client"
                  ) : null}
                </span>
              </div>
            </div>
            {showSetPassword && (
              <Link
                href="/dashboard/settings"
                className="hidden nav:block px-2 py-1.5 text-[12px] text-text-primary hover:opacity-80 transition-opacity"
              >
                Set a password →
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
              className="w-full text-center nav:text-left px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
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
        ) : (
          <div className="px-2 nav:px-3 py-3 space-y-1.5">
            <Link
              href="/apply"
              title="Apply to join"
              className="block w-full text-center px-2 nav:px-3 py-1.5 text-[12px] font-medium text-white bg-text-primary rounded-md hover:bg-accent-hover transition-colors"
            >
              <span className="hidden nav:inline">Apply to join</span>
              <span className="nav:hidden">Apply</span>
            </Link>
            <Link
              href="/login"
              className="hidden nav:block w-full text-center px-2 py-1 text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
