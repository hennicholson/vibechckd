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
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
        active
          ? "text-text-primary font-medium bg-surface-muted"
          : "text-text-muted hover:text-text-primary hover:bg-background-alt"
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
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
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [whopLinked, setWhopLinked] = useState(false);
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.hasPassword === "boolean") setHasPassword(d.hasPassword);
        if (typeof d?.whopLinked === "boolean") setWhopLinked(d.whopLinked);
      })
      .catch(() => {});
  }, [status]);
  const showSetPassword = whopLinked && hasPassword === false;

  return (
    <aside className="hidden md:flex flex-col w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen bg-background">
      {/* Logo */}
      <div className="px-4 h-[48px] flex items-center border-b border-border">
        <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
          vibechckd
          <VerifiedSeal size="sm" />
        </Link>
      </div>

      {/* Primary nav — same items, ordering, and role-gating as the dashboard
          rail so transitions /whop ↔ /dashboard don't visually jolt. */}
      <div className="px-3 py-3 space-y-0.5">
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

      {/* Filter section — only meaningful here (not on /dashboard pages) */}
      <div className="px-3 pt-2 pb-1 border-t border-border mt-1">
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
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted flex-shrink-0">
                {session.user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex flex-col min-w-0">
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
                className="block px-2 py-1.5 text-[12px] text-text-primary hover:opacity-80 transition-opacity"
              >
                Set a password →
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="px-3 py-3 space-y-1.5">
            <Link
              href="/apply"
              className="block w-full text-center px-3 py-1.5 text-[12px] font-medium text-white bg-text-primary rounded-md hover:bg-accent-hover transition-colors"
            >
              Apply to join
            </Link>
            <Link
              href="/login"
              className="block w-full text-center px-2 py-1 text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
