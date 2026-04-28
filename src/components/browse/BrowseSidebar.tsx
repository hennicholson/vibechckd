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
import { useSession, signOut } from "next-auth/react";
import VerifiedSeal from "@/components/VerifiedSeal";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";

type Filter = "all" | Specialty;

interface BrowseSidebarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<string, number>;
}

const iconBase = "w-4 h-4 flex-shrink-0";

const SearchIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const FolderIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ChatIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

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
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isCreator = role === "coder" || role === "admin";
  const isClient = role === "client";

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

      {/* Primary nav */}
      <div className="px-3 py-3 space-y-0.5">
        <NavItem href="/browse" active icon={<SearchIcon />}>
          Browse
        </NavItem>
        <NavItem href="/dashboard/teams/new" icon={<UsersIcon />}>
          Build a Team
        </NavItem>
        <NavItem href="/dashboard/projects" icon={<FolderIcon />}>
          Projects
        </NavItem>
        <NavItem href="/dashboard/inbox" icon={<ChatIcon />}>
          Messages
        </NavItem>
      </div>

      {/* Filter section */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted px-2 mb-1">
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

      {/* User footer */}
      <div className="mt-auto border-t border-border">
        {status === "authenticated" && session?.user ? (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 px-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-medium text-text-muted flex-shrink-0">
                {session.user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="text-[13px] text-text-primary truncate">
                {session.user.name}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              Dashboard
            </Link>
            {isCreator && (
              <>
                <Link
                  href="/dashboard/profile"
                  className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard/portfolio"
                  className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Portfolio
                </Link>
                <Link
                  href="/dashboard/application"
                  className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Application
                </Link>
              </>
            )}
            {isClient && (
              <Link
                href="/dashboard/company"
                className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors"
              >
                Company
              </Link>
            )}
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
