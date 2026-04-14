"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Badge from "@/components/Badge";
import Tag from "@/components/Tag";
import Button from "@/components/Button";
import { useSession, signOut } from "next-auth/react";
import { coders as fallbackCoders, SPECIALTIES, SPECIALTY_LABELS, type Coder, type Specialty } from "@/lib/mock-data";
import VerifiedSeal from "@/components/VerifiedSeal";

function BrowseSidebarUser() {
  const { data: session, status } = useSession();

  if (status === "authenticated" && session?.user) {
    return (
      <div className="mt-auto px-3 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 px-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center text-[10px] font-medium text-text-muted">
            {session.user.name?.charAt(0) || "?"}
          </div>
          <span className="text-[12px] text-text-primary truncate">{session.user.name}</span>
        </div>
        <Link href="/dashboard" className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-md transition-colors">
          Dashboard
        </Link>
        <Link href="/dashboard/profile" className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-md transition-colors">
          Profile
        </Link>
        <Link href="/dashboard/portfolio" className="block px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-md transition-colors">
          Portfolio
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left px-2 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto px-3 py-4 border-t border-border space-y-2">
      <Link href="/apply">
        <button className="w-full px-3 py-2 text-[12px] font-medium text-text-primary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer">
          Apply to join
        </button>
      </Link>
      <Link href="/login">
        <button className="w-full px-3 py-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          Log in
        </button>
      </Link>
    </div>
  );
}

function OnboardingPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative bg-background border border-border rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-w-[400px] w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <VerifiedSeal size="lg" />
          <span className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">Welcome to the gallery</span>
        </div>

        <div className="space-y-3 mb-5">
          <p className="text-[13px] text-text-secondary leading-[1.6]">
            Every coder you see here has been through our rigorous vetting process. We review portfolio quality, code standards, design taste, and professional reliability.
          </p>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">1</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Browse coders</span> — Click any profile to see their full portfolio, live previews, and skills.
            </p>
          </div>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">2</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Filter by specialty</span> — Use the sidebar to narrow by Frontend, Backend, Security, and more.
            </p>
          </div>
          <div className="flex items-start gap-2.5 py-2">
            <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-mono font-medium text-text-muted">3</span>
            </div>
            <p className="text-[12px] text-text-muted leading-[1.5]">
              <span className="text-text-primary font-medium">Start a project</span> — Found your match? Initiate directly or build a full team.
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-4 py-2.5 text-[13px] font-medium bg-[#171717] text-[#fafafa] rounded-lg hover:bg-[#0a0a0a] transition-colors cursor-pointer"
        >
          Start browsing
        </button>
      </motion.div>
    </motion.div>
  );
}

function isRealUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function CoderCard({ coder, onClick, index }: { coder: Coder; onClick: () => void; index: number }) {
  const thumbnailUrl = coder.gifPreviewUrl && isRealUrl(coder.gifPreviewUrl)
    ? coder.gifPreviewUrl
    : coder.avatarUrl;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
      onClick={onClick}
      className="w-full text-left rounded-[10px] overflow-hidden border border-border hover:border-border-hover hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-150 cursor-pointer group"
    >
      <div className="aspect-[3/2] bg-surface-muted overflow-hidden pfp-static">
        <img
          src={thumbnailUrl}
          alt={coder.displayName}
          className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-500"
        />
      </div>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-surface-muted overflow-hidden flex-shrink-0">
          <img src={coder.avatarUrl} alt={coder.displayName} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-medium text-text-primary truncate">{coder.displayName}</span>
            {coder.verified && <Badge variant="verified" />}
          </div>
          <span className="text-[12px] text-text-muted truncate block">{coder.title}</span>
        </div>
        <span className="text-[11px] font-mono text-text-muted flex-shrink-0 hidden sm:block">{coder.hourlyRate}</span>
      </div>
    </motion.button>
  );
}

function CoderOverlay({ coder, onClose }: { coder: Coder; onClose: () => void }) {
  const livePreviewAsset = coder.portfolio
    .flatMap((p) => p.assets)
    .find((a) => a.type === "live_preview");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
        className="relative bg-background rounded-xl border border-border shadow-[0_24px_80px_rgba(0,0,0,0.15)] w-full max-w-[960px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border h-[48px] flex items-center justify-between px-5">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
          <div className="flex gap-2">
            <Link href={`/coders/${coder.slug}`}>
              <Button variant="secondary" size="sm">View full profile</Button>
            </Link>
            <Button size="sm">Start project</Button>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            {/* Left: Preview + Profile */}
            <div>
              {/* Main preview area */}
              {livePreviewAsset ? (
                <div className="border border-border rounded-[10px] overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                      <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                      <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
                    </div>
                    <div className="flex-1 mx-2">
                      <div className="bg-background border border-border rounded-md px-2.5 py-1 text-[11px] font-mono text-text-muted truncate">
                        {livePreviewAsset.url}
                      </div>
                    </div>
                    <a
                      href={livePreviewAsset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <iframe
                    src={livePreviewAsset.url}
                    className="w-full h-[480px] bg-white"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-[10px] overflow-hidden border border-border pfp-static">
                  <img src={coder.avatarUrl} alt={coder.displayName} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Coder profile info */}
              <div className="mt-5">
                <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em]">
                  {SPECIALTY_LABELS[coder.specialties[0]]} &middot; {coder.title}
                </p>
                <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.03em] mt-1">
                  {coder.displayName}
                </h1>
                <p className="text-[14px] text-text-secondary mt-3 leading-[1.6] max-w-[600px]">
                  {coder.bio}
                </p>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {coder.skills.map((skill) => (
                  <Tag key={skill}>{skill}</Tag>
                ))}
              </div>

              {/* Portfolio items list */}
              {coder.portfolio.length > 0 && (
                <div className="mt-8">
                  <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em] mb-3">
                    Portfolio ({coder.portfolio.length})
                  </p>
                  <div className="border border-border rounded-[10px] overflow-hidden">
                    {coder.portfolio.map((item, i) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          i < coder.portfolio.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div className="w-10 h-10 rounded-md bg-surface-muted overflow-hidden flex-shrink-0">
                          <img src={coder.avatarUrl} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-text-primary truncate">{item.title}</p>
                          <p className="text-[12px] text-text-muted truncate">{item.description}</p>
                        </div>
                        <span className="text-[11px] font-mono text-text-muted flex-shrink-0">
                          {item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Creator card */}
            <div>
              <div className="sticky top-[64px]">
                <div className="border border-border rounded-[10px] p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] overflow-hidden bg-surface-muted pfp-static">
                      <img src={coder.avatarUrl} alt={coder.displayName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold text-text-primary">{coder.displayName}</span>
                        {coder.verified && <Badge variant="verified" size="md" />}
                      </div>
                      <span className="text-[12px] text-text-muted">{coder.title}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-muted">Rate</span>
                      <span className="text-[12px] font-medium text-text-primary">{coder.hourlyRate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-muted">Availability</span>
                      <Badge variant={coder.availability} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-muted">Location</span>
                      <span className="text-[12px] text-text-primary">{coder.location}</span>
                    </div>
                  </div>

                  {/* Social */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    {coder.githubUrl && (
                      <a href={coder.githubUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                      </a>
                    )}
                    {coder.twitterUrl && (
                      <a href={coder.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {coder.linkedinUrl && (
                      <a href={coder.linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    )}
                    {coder.websiteUrl && (
                      <a href={coder.websiteUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 mt-5">
                    <Button className="flex-1">Start project</Button>
                    <Button variant="secondary" className="flex-1">Send inquiry</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BrowsePage() {
  const [coders, setCoders] = useState<Coder[]>(fallbackCoders);
  const [filter, setFilter] = useState<string>("all");
  const [selectedCoder, setSelectedCoder] = useState<Coder | null>(null);

  useEffect(() => {
    fetch("/api/coders")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCoders(data); })
      .catch(() => {});
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("vibechckd_onboarding_dismissed");
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCoders = useMemo(() => {
    let list = coders;
    if (filter !== "all") {
      list = list.filter((c) => c.specialties.includes(filter as Specialty));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.specialties.some((s) => SPECIALTY_LABELS[s].toLowerCase().includes(q)) ||
          c.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [coders, filter, searchQuery]);

  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SPECIALTIES.forEach((s) => {
      counts[s] = coders.filter((c) => c.specialties.includes(s)).length;
    });
    return counts;
  }, [coders]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-[200px] border-r border-border flex-shrink-0 sticky top-0 h-screen">
        <div className="px-4 h-[48px] flex items-center border-b border-border">
          <Link href="/" className="text-[14px] font-semibold text-text-primary inline-flex items-center gap-1">
            vibechckd
            <VerifiedSeal size="sm" />
          </Link>
        </div>

        {/* Nav Links */}
        <div className="px-3 py-3 space-y-0.5">
          <Link href="/browse" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-medium text-text-primary bg-surface-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Browse
          </Link>
          <Link href="/dashboard/teams/new" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-text-muted hover:text-text-primary hover:bg-background-alt transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Build a Team
          </Link>
        </div>

        {/* Filters */}
        <div className="px-3 mt-4">
          <p className="px-2 text-[11px] font-mono text-text-muted uppercase tracking-[0.06em] mb-2">Filter</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                filter === "all" ? "text-text-primary font-medium bg-surface-muted" : "text-text-muted hover:text-text-primary hover:bg-background-alt"
              }`}
            >
              All coders
            </button>
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                  filter === s ? "text-text-primary font-medium bg-surface-muted" : "text-text-muted hover:text-text-primary hover:bg-background-alt"
                }`}
              >
                {SPECIALTY_LABELS[s]} <span className="text-text-muted font-normal">({specialtyCounts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        <BrowseSidebarUser />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border h-[48px] flex items-center px-4">
          <Link href="/" className="text-[14px] font-semibold text-text-primary">vibechckd</Link>
        </div>

        <div className="flex-1 min-w-0 p-4">
          {/* Search */}
          <div className="mb-4 px-1">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, specialty, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] text-text-primary bg-background border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors"
              />
            </div>
          </div>

          {/* Header */}
          <motion.div
            className="flex items-center gap-2 mb-5 px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-[11px] font-mono font-medium text-text-muted uppercase tracking-[0.1em]">Verified</h1>
            <VerifiedSeal size="md" />
            <span className="text-[11px] font-mono text-text-muted ml-1">{filteredCoders.length} coder{filteredCoders.length !== 1 ? "s" : ""}</span>
          </motion.div>

          {/* Coder Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCoders.map((coder, i) => (
              <CoderCard
                key={coder.id}
                coder={coder}
                onClick={() => setSelectedCoder(coder)}
                index={i}
              />
            ))}
          </div>

          {filteredCoders.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[13px] text-text-muted">No coders found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Coder Overlay */}
      <AnimatePresence>
        {selectedCoder && (
          <CoderOverlay
            coder={selectedCoder}
            onClose={() => setSelectedCoder(null)}
          />
        )}
      </AnimatePresence>

      {/* Onboarding popup */}
      <AnimatePresence>
        {showOnboarding && <OnboardingPopup onDismiss={() => { setShowOnboarding(false); sessionStorage.setItem("vibechckd_onboarding_dismissed", "1"); }} />}
      </AnimatePresence>
    </div>
  );
}
