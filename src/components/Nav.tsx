"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/dashboard/teams/new", label: "Build a Team" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border h-[48px]">
      <div className="max-w-[960px] mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-0">
          <Link href="/" className="font-body text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
            vibechckd
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#0a0a0a" />
              <path d="M7 12.5L10.5 16L17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <div className="hidden md:block w-px h-4 bg-border mx-5" />

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                  pathname === link.href
                    ? "text-text-primary font-medium"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Not logged in — Login + Apply (always rendered, hidden when authenticated) */}
          <div className={`hidden md:flex items-center gap-2 ${status === "authenticated" ? "!hidden" : ""}`}>
            <Link href="/login">
              <button className="px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                Log in
              </button>
            </Link>
            <Link href="/apply">
              <button className="px-3.5 py-1.5 text-[12px] font-medium text-[#fafafa] bg-[#171717] rounded-md hover:bg-[#0a0a0a] transition-colors duration-150 cursor-pointer">
                Apply
              </button>
            </Link>
          </div>

          {status === "authenticated" && session?.user ? (
            /* Logged in — Dashboard button + user menu */
            <>
            <Link href="/dashboard" className="hidden md:inline-flex items-center px-2.5 py-1 text-[12px] font-medium text-text-muted border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors duration-150">
              Dashboard
            </Link>
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted">
                  {session.user.name?.charAt(0) || "?"}
                </div>
                <span className="text-[13px] text-text-primary">{session.user.name?.split(" ")[0]}</span>
                <svg className={`w-3 h-3 text-text-muted transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.6 }}
                    className="absolute right-0 top-full mt-1 w-[200px] bg-background border border-border rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden"
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[13px] font-medium text-text-primary">{session.user.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{session.user.email}</p>
                      <p className="text-[10px] font-mono text-text-muted mt-0.5 uppercase tracking-[0.04em]">
                        {(session.user as any).role === "client" ? "Client" : "Creator"}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Dashboard
                      </Link>
                      <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Profile
                      </Link>
                      <Link href="/dashboard/portfolio" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Portfolio
                      </Link>
                      <Link href="/dashboard/projects" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Projects
                      </Link>
                      <Link href="/dashboard/inbox" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Inbox
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-border py-1">
                      <button
                        onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                        className="w-full text-left px-3 py-1.5 text-[13px] text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                      >
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
          ) : null}

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span className={`block w-4 h-[1.5px] bg-text-primary transition-all duration-200 ${mobileOpen ? "translate-y-[3px] rotate-45" : ""}`} />
            <span className={`block w-4 h-[1.5px] bg-text-primary transition-all duration-200 mt-[5px] ${mobileOpen ? "-translate-y-[2px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden border-t border-border bg-background"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="px-6 py-3 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2 text-[13px] transition-colors ${
                    pathname === link.href
                      ? "text-text-primary font-medium"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {session?.user ? (
                <>
                  <div className="border-t border-border pt-2 mt-2 space-y-1">
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Dashboard</Link>
                    <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Profile</Link>
                    <Link href="/dashboard/portfolio" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Portfolio</Link>
                    <Link href="/dashboard/projects" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Projects</Link>
                    <Link href="/dashboard/inbox" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Inbox</Link>
                    <Link href="/dashboard/settings" onClick={() => setMobileOpen(false)} className="block py-2 text-[13px] text-text-muted">Settings</Link>
                  </div>
                  <button onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }} className="block py-2 text-[13px] text-text-muted cursor-pointer">
                    Sign out
                  </button>
                </>
              ) : (
                <div className="border-t border-border pt-2 mt-2 flex gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <button className="w-full py-2 text-[13px] text-text-muted border border-border rounded-md cursor-pointer">Log in</button>
                  </Link>
                  <Link href="/apply" onClick={() => setMobileOpen(false)} className="flex-1">
                    <button className="w-full py-2 text-[13px] text-[#fafafa] bg-[#171717] rounded-md cursor-pointer">Apply</button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
