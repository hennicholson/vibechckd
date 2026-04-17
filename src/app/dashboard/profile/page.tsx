"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ProfileForm from "@/components/dashboard/ProfileForm";
import Badge from "@/components/Badge";
import VerifiedSeal from "@/components/VerifiedSeal";
import { SPECIALTY_LABELS, type Specialty } from "@/lib/mock-data";

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

function ProfilePreview({ data }: { data: ProfileData }) {
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

  // Simulated browser frame
  return (
    <div className="space-y-4">
      {/* Browser chrome */}
      <div className="border border-border rounded-[12px] overflow-hidden bg-background shadow-sm">
        {/* URL bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/60" />
          </div>
          <div className="flex-1 bg-background border border-border rounded-md px-3 py-1 text-[11px] font-mono text-text-muted truncate">
            vibechckd.cc/coders/{data.slug || "your-name"}
          </div>
        </div>

        {/* Profile content */}
        <div className="p-4 md:p-6">
          {/* Hero area */}
          <div className="flex flex-col sm:flex-row gap-5 mb-6">
            {/* Avatar / GIF */}
            <div className="flex-shrink-0">
              {hasGif ? (
                <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-[14px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.gifPreviewUrl} alt={data.displayName} className="w-full h-full object-cover" />
                </div>
              ) : hasPfp ? (
                <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-[14px] overflow-hidden pfp-static">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.avatarUrl} alt={data.displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-[14px] bg-surface-muted flex items-center justify-center text-[28px] font-semibold text-text-muted select-none">
                  {initials || "?"}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] truncate">
                  {data.displayName || "Your Name"}
                </h2>
                {data.verified && <VerifiedSeal size="md" />}
              </div>

              {data.tagline && (
                <p className="text-[14px] text-text-secondary mb-3">{data.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: availabilityColor }} />
                  <span className="text-[12px] font-mono text-text-muted">{availabilityLabel}</span>
                </div>
                {data.hourlyRate && (
                  <>
                    <span className="text-border">|</span>
                    <span className="text-[12px] font-mono text-text-muted">{data.hourlyRate}</span>
                  </>
                )}
                {data.location && (
                  <>
                    <span className="text-border">|</span>
                    <span className="text-[12px] text-text-muted flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {data.location}
                    </span>
                  </>
                )}
              </div>

              {/* Specialties */}
              {data.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {data.specialties.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-surface-muted text-[11px] font-medium text-text-secondary">
                      {SPECIALTY_LABELS[s]}
                    </span>
                  ))}
                </div>
              )}

              {/* Social links */}
              {socials.length > 0 && (
                <div className="flex items-center gap-2.5">
                  {socials.map((s, i) => (
                    <span key={i} className="text-text-muted">{s.icon}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {data.bio && (
            <div className="mb-6">
              <h3 className="text-[12px] font-mono uppercase tracking-wider text-text-muted mb-2">About</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {data.bio}
              </p>
            </div>
          )}

          {/* Portfolio placeholder */}
          <div>
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-text-muted mb-3">Portfolio</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/2] rounded-[8px] bg-surface-muted border border-border flex items-center justify-center">
                  <span className="text-[11px] text-text-muted">Project {i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shareable link */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-text-muted">This is how clients will see your profile at</span>
        <span className="text-[11px] font-mono text-text-primary">vibechckd.cc/coders/{data.slug || "your-name"}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [initialData, setInitialData] = useState<ProfileData | null>(null);
  const [liveData, setLiveData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setInitialData(data);
          setLiveData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1100px] h-full flex flex-col">
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
        />
      )}
      </div>{/* end scrollable content */}
    </div>
  );
}
