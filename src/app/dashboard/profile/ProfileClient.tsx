"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProfileForm from "@/components/dashboard/ProfileForm";
import Badge from "@/components/Badge";
import VerifiedSeal from "@/components/VerifiedSeal";
import Modal from "@/components/Modal";
import PortfolioFolder from "@/components/PortfolioFolder";
import { SPECIALTY_LABELS, type Specialty, type PortfolioItem as MockPortfolioItem } from "@/lib/mock-data";

type ProfileData = {
  displayName: string;
  slug?: string;
  tagline: string;
  location: string;
  bio: string;
  specialties: Specialty[];
  hourlyRate: string;
  availability: "available" | "selective" | "unavailable";
  githubUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  avatarUrl: string;
  gifPreviewUrl: string;
  verified?: boolean;
};

const tabs = [
  { key: "edit" as const, label: "Edit" },
  { key: "preview" as const, label: "Preview" },
];

function isRealUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function ProfilePreview({ data, portfolio = [] }: { data: ProfileData; portfolio?: PortfolioItem[] }) {
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const hasPfp = isRealUrl(data.avatarUrl) || data.avatarUrl.startsWith("/pfp/");
  const hasGif = data.gifPreviewUrl && isRealUrl(data.gifPreviewUrl);
  const initials = data.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const availabilityColor =
    data.availability === "available"
      ? "#22c55e"
      : data.availability === "selective"
        ? "#f59e0b"
        : "#a3a3a3";

  const availabilityLabel =
    data.availability === "available"
      ? "Available"
      : data.availability === "selective"
        ? "Selective"
        : "Unavailable";

  const socials = [
    { url: data.githubUrl, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
    { url: data.twitterUrl, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { url: data.linkedinUrl, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
    { url: data.websiteUrl, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
  ].filter((s) => s.url);

  const specialtyLabel = data.specialties?.[0]
    ? SPECIALTY_LABELS[data.specialties[0]] || data.specialties[0]
    : "";

  return (
    <div className="space-y-3">
      {/* Browser chrome frame */}
      <div className="border border-border rounded-[12px] overflow-hidden bg-background shadow-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]/50" />
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]/50" />
            <span className="w-2 h-2 rounded-full bg-[#22c55e]/50" />
          </div>
          <div className="flex-1 bg-background border border-border rounded px-2.5 py-0.5 text-[10px] font-mono text-text-muted truncate">
            vibechckd.cc/coders/{data.slug || "your-name"}
          </div>
        </div>

        {/* Matches /coders/[slug] layout exactly */}
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left column -- matches public profile (sticky) */}
            <div className="w-full md:w-[280px] flex-shrink-0 md:sticky md:top-4 md:self-start">
              {/* Avatar */}
              <div className="w-[100px] h-[100px] rounded-[10px] overflow-hidden bg-surface-muted pfp-static">
                {hasGif ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.gifPreviewUrl} alt={data.displayName} className="w-full h-full object-cover" />
                ) : hasPfp ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatarUrl} alt={data.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[28px] font-semibold text-text-muted">
                    {initials || "?"}
                  </div>
                )}
              </div>

              {/* Name + verified */}
              <div className="flex items-center gap-2 mt-3">
                <h2 className="text-[18px] font-semibold text-text-primary tracking-[-0.02em]">
                  {data.displayName || "Your Name"}
                </h2>
                {data.verified && <VerifiedSeal size="md" />}
              </div>

              {/* Specialty + rate */}
              {(specialtyLabel || data.hourlyRate) && (
                <p className="text-[13px] text-text-muted mt-1">
                  {[specialtyLabel, data.hourlyRate].filter(Boolean).join(" \u00b7 ")}
                </p>
              )}
              {data.location && (
                <p className="text-[13px] text-text-muted mt-0.5">{data.location}</p>
              )}

              {/* Bio */}
              {data.bio && (
                <p className="text-[13px] text-text-secondary mt-3 leading-[1.65] whitespace-pre-wrap">
                  {data.bio}
                </p>
              )}

              {/* Specialties as tags */}
              {data.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {data.specialties.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-surface-muted text-[11px] font-medium text-text-secondary">
                      {SPECIALTY_LABELS[s]}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA buttons (non-functional in preview) */}
              <div className="flex gap-2 mt-4">
                <span className="px-4 py-2 text-[13px] font-medium bg-[#171717] text-white rounded-lg">Start project</span>
                <span className="px-4 py-2 text-[13px] font-medium border border-border text-text-primary rounded-lg">Send inquiry</span>
              </div>

              {/* Social links */}
              {socials.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {socials.map((s, i) => (
                    <span key={i} className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                      {s.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right column -- Portfolio */}
            <div className="flex-1 min-w-0">
              {portfolio.length > 0 ? (
                <>
                  <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-3">Work</p>
                  <div className="space-y-3">
                    {portfolio.map((item) => {
                      const thumb = item.thumbnailUrl || item.assets?.find((a) => a.type !== "live_preview")?.url || "";
                      const hasImage = thumb && (thumb.startsWith("http") || thumb.startsWith("/"));
                      const livePreview = item.assets?.find((a) => a.type === "live_preview");
                      return (
                        <div key={item.id} onClick={() => setSelectedItem(item)} className="border border-border rounded-[10px] overflow-hidden hover:border-border-hover transition-colors group cursor-pointer">
                          {livePreview ? (
                            /* Live preview -- scaled iframe render */
                            <div className="relative aspect-[16/9] bg-surface-muted overflow-hidden">
                              <div className="absolute inset-0 origin-top-left grayscale group-hover:grayscale-0 transition-[filter] duration-500" style={{ width: "200%", height: "200%", transform: "scale(0.5)" }}>
                                <iframe
                                  src={livePreview.url}
                                  title={item.title}
                                  className="w-full h-full border-0 pointer-events-none" scrolling="no"
                                  loading="lazy"
                                  sandbox="allow-scripts allow-same-origin"
                                />
                              </div>
                              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm z-10">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                                <span className="text-[9px] font-medium text-white uppercase tracking-wider">Live</span>
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-start p-3 z-10">
                                <span className="text-[11px] font-medium text-white/0 group-hover:text-white transition-colors duration-300 flex items-center gap-1">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                                  View
                                </span>
                              </div>
                            </div>
                          ) : hasImage ? (
                            <div className="aspect-[16/9] bg-surface-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <div className="px-3 py-2.5">
                            <p className="text-[14px] font-medium text-text-primary">{item.title}</p>
                            {item.description && (
                              <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-text-muted">No portfolio items yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio item modal */}
      <Modal open={selectedItem !== null} onClose={() => setSelectedItem(null)} size="full">
        {selectedItem && (
          <PortfolioFolder
            item={{
              ...selectedItem,
              assets: selectedItem.assets.map((a) => ({
                id: a.id,
                type: a.type as "pdf" | "image" | "video" | "live_preview" | "figma",
                title: a.type === "live_preview" ? "Live Preview" : selectedItem.title,
                url: a.url,
              })),
            }}
            onBack={() => setSelectedItem(null)}
          />
        )}
      </Modal>

      {/* Shareable link */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Share your profile:</span>
          <span className="text-[11px] font-mono text-text-primary">vibechckd.cc/coders/{data.slug || "your-name"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const url = `https://vibechckd.cc/coders/${data.slug || ""}`;
              navigator.clipboard.writeText(url);
            }}
            className="text-[10px] font-medium text-text-muted hover:text-text-primary border border-border rounded px-2 py-0.5 transition-colors cursor-pointer"
          >
            Copy link
          </button>
          {data.slug && (
            <a
              href={`/coders/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-text-muted hover:text-text-primary border border-border rounded px-2 py-0.5 transition-colors no-underline"
            >
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  assets: { id: string; type: string; url: string }[];
};

export default function ProfilePage() {
  const [initialData, setInitialData] = useState<ProfileData | null>(null);
  const [liveData, setLiveData] = useState<ProfileData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/portfolio").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([profileData, portfolioData]) => {
        if (profileData) {
          setInitialData(profileData);
          setLiveData(profileData);
        }
        if (Array.isArray(portfolioData)) {
          setPortfolio(portfolioData.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description || "",
            thumbnailUrl: item.thumbnailUrl || "",
            assets: (item.assets || []).map((a: any) => ({
              id: a.id,
              type: a.assetType || a.type,
              url: a.fileUrl || a.url || "",
            })),
          })));
        }
      })
      .catch((err) => console.error("Profile load error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Profile
          </h1>

          {/* Segmented control */}
          <div className="inline-flex bg-surface-muted rounded-lg p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                  activeTab === tab.key
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="profile-segment-indicator"
                    className="absolute inset-0 bg-background border border-border rounded-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : activeTab === "edit" ? (
        <ProfileForm
          initialData={initialData ?? undefined}
          onFormChange={(data) => setLiveData(data)}
        />
      ) : (
        <ProfilePreview
          data={{
            ...(liveData ?? {
              displayName: "",
              tagline: "",
              location: "",
              bio: "",
              specialties: [],
              hourlyRate: "",
              availability: "available" as const,
              githubUrl: "",
              twitterUrl: "",
              linkedinUrl: "",
              websiteUrl: "",
              avatarUrl: "",
              gifPreviewUrl: "",
            }),
            slug: initialData?.slug,
            verified: initialData?.verified,
          }}
          portfolio={portfolio}
        />
      )}
      </div>{/* end scrollable content */}
    </div>
  );
}
