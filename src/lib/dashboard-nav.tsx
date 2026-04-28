import type { ReactNode } from "react";

// Single source of truth for the left-rail nav across the dashboard AND
// the browse / Whop iframe surfaces. Keeping both rails in sync prevents
// the visual jolt the user described when navigating /whop ↔ /dashboard
// (different items, different ordering, different active styles).
//
// `roles` controls who sees each item. The dashboard sidebar maps the DB
// `coder|admin` roles into a "creator" UI role; the browse sidebar does
// the same — both consume this list with the same `role: "client"|"creator"`.

export type DashboardRole = "client" | "creator";

export type NavItem = {
  href: string;
  label: string;
  roles: DashboardRole[];
  icon: ReactNode;
  // Additional URL prefixes that should also count as "active" — e.g.,
  // /whop renders BrowsePage, so the "Browse Talent" item should highlight
  // for both /browse and /whop.
  matchPrefixes?: string[];
};

const cls = "w-4 h-4";
const stroke = { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 } as const;

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    roles: ["client", "creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/browse",
    label: "Browse Talent",
    roles: ["client", "creator"], // creators benefit too — see the marketplace, peer profiles
    matchPrefixes: ["/whop", "/coders"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/teams/new",
    label: "Build a Team",
    roles: ["client"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/company",
    label: "Company",
    roles: ["client"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    roles: ["creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/portfolio",
    label: "Portfolio",
    roles: ["creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/application",
    label: "Application",
    roles: ["creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/earnings",
    label: "Earnings",
    roles: ["creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="6" width="20" height="14" rx="2" {...stroke} />
        <path {...stroke} d="M2 10h20M16 14h2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    roles: ["client", "creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inbox",
    label: "Inbox",
    roles: ["client", "creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    roles: ["client", "creator"],
    icon: (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path {...stroke} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path {...stroke} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export const adminItem: NavItem = {
  href: "/dashboard/admin",
  label: "Admin",
  roles: ["client", "creator"], // displayed only when rawRole === "admin", controlled by caller
  icon: (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path {...stroke} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

// Map the DB role enum (`client | coder | admin`) to the UI role shown in
// the sidebar. coders and admins both see the "creator" rail.
export function uiRole(rawRole: string | undefined): DashboardRole | undefined {
  if (rawRole === "client") return "client";
  if (rawRole === "coder" || rawRole === "admin") return "creator";
  return undefined;
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (pathname.startsWith(item.href)) return true;
  return (item.matchPrefixes ?? []).some((p) => pathname.startsWith(p));
}
