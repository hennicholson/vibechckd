"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUnreadCount } from "@/lib/use-unread-count";

// Floating bottom-right shortcut to /dashboard/inbox.
//
// Visible: only when signed in.
// Hidden:  on /dashboard/inbox itself (already there) and on the auth /
//          apply / legal flows where a floating CTA would be noise.
// Unread:  shares the same useUnreadCount() hook the sidebar uses so the
//          dot is always in sync with the inbox indicator.
//
// Position: above the mobile bottom-nav + iOS safe-area inset, so it
// never sits on top of the home indicator.
export default function QuickChatButton() {
  const { status } = useSession();
  const pathname = usePathname();
  const unread = useUnreadCount();

  if (status !== "authenticated") return null;

  // Hide on the inbox itself and on routes where the button would be
  // visual noise rather than a useful shortcut.
  const HIDE_ON = [
    "/dashboard/inbox",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/apply",
  ];
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <Link
      href="/dashboard/inbox"
      aria-label={
        unread > 0
          ? `Open inbox — ${unread} unread`
          : "Open inbox"
      }
      title="Inbox"
      className="fixed z-40 right-4 md:right-6 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-text-primary text-background shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
    >
      <svg
        className="w-[22px] h-[22px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-negative text-white text-[10px] font-mono tabular-nums ring-2 ring-background"
          aria-hidden
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
