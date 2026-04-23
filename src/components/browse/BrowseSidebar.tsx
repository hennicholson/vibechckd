"use client";

/**
 * BrowseSidebar — Editorial left rail for the /browse page.
 *
 * Design tokens used (all defined in globals.css @theme):
 *  - border / border-hover / text-primary / text-muted / text-secondary
 *  - surface-muted / background / background-alt
 *
 * Typography scale (deliberately generous to feel editorial, not dashboard-y):
 *  - Logo:         17px  semibold   tracking -0.02em
 *  - Nav labels:   16px  medium     tracking 0.01em
 *  - FILTER label: 11px  medium     uppercase  letter-spacing 0.16em
 *  - Filter items: 16px  regular    tracking 0.01em  (active = 500)
 *  - User name:    14px  medium
 *  - Footer links: 13px  regular
 *
 * Responsive plan:
 *  - >= 768px (md+): sticky full-height sidebar, 320px wide
 *  - <  768px: hidden; parent renders a top bar + drawer instead
 */

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import VerifiedSeal from "@/components/VerifiedSeal";
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";

type Filter = "all" | Specialty;

interface BrowseSidebarProps {
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  counts: Record<string, number>;
  totalCount: number;
}

// Minimal stroke icons — 20px to match the bumped-up type scale.
const iconBase = "w-5 h-5 flex-shrink-0";

const SearchIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m1.95-5.05a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const FolderIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.6a2 2 0 011.4.58l1.42 1.42A2 2 0 0012.83 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const ChatIcon = () => (
  <svg className={iconBase} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
      className={`flex items-center gap-3 px-4 py-3 rounded-full text-[16px] leading-[1.25] transition-colors ${
        active
          ? "bg-[#0a0a0a] text-white"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
      }`}
    >
      {icon}
      <span className="font-medium tracking-[0.01em]">{children}</span>
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
      className="w-full text-left pl-5 pr-3 py-2 flex items-center cursor-pointer group relative"
    >
      {/* Active left indicator — bold 3px × 24px editorial mark */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px] rounded-[1px] bg-text-primary transition-opacity duration-150 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <span
        className={`text-[16px] leading-[1.6] tracking-[0.01em] transition-colors duration-150 ${
          active
            ? "text-text-primary font-medium"
            : "text-text-muted group-hover:text-text-primary"
        }`}
      >
        {label}
        {count !== undefined && (
          <span className={`ml-1.5 font-normal ${active ? "text-text-muted" : "text-text-muted/70"}`}>
            ({count})
          </span>
        )}
      </span>
    </button>
  );
}

export default function BrowseSidebar({ filter, onFilterChange, counts, totalCount }: BrowseSidebarProps) {
  const { data: session, status } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-[300px] lg:w-[320px] border-r border-border flex-shrink-0 sticky top-0 h-screen bg-background">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <span className="text-[17px] font-semibold text-text-primary tracking-[-0.02em]">
            vibechckd
          </span>
          <VerifiedSeal size="sm" />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="px-3 space-y-1.5">
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
      </nav>

      {/* Filter section */}
      <div className="mt-11 px-6 mb-4">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-[0.16em]">
          Filter
        </p>
      </div>
      <div className="px-3 space-y-1">
        <FilterButton
          active={filter === "all"}
          label="All coders"
          onClick={() => onFilterChange("all")}
          count={totalCount}
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

      {/* User footer */}
      <div className="mt-auto border-t border-border">
        {status === "authenticated" && session?.user ? (
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center text-[13px] font-medium text-white flex-shrink-0">
                {session.user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="text-[14px] text-text-primary font-medium truncate tracking-[0.01em]">
                {session.user.name}
              </span>
            </div>
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="block text-[13px] text-text-muted hover:text-text-primary transition-colors tracking-[0.01em]"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/profile"
                className="block text-[13px] text-text-muted hover:text-text-primary transition-colors tracking-[0.01em]"
              >
                Profile
              </Link>
              <Link
                href="/dashboard/portfolio"
                className="block text-[13px] text-text-muted hover:text-text-primary transition-colors tracking-[0.01em]"
              >
                Portfolio
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer tracking-[0.01em]"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-2">
            <Link
              href="/apply"
              className="block w-full text-center px-4 py-2.5 text-[14px] font-medium text-white bg-[#0a0a0a] rounded-full hover:bg-black transition-colors tracking-[0.01em]"
            >
              Apply to join
            </Link>
            <Link
              href="/login"
              className="block w-full text-center px-4 py-2 text-[13px] text-text-muted hover:text-text-primary transition-colors tracking-[0.01em]"
            >
              Log in
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
