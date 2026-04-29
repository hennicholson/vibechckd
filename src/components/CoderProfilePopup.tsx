"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import Badge from "./Badge";
import Tag from "./Tag";
import Button from "./Button";
import FavoriteButton from "./FavoriteButton";
import { useFavorites } from "@/lib/use-favorites";
import type { Coder, PortfolioItem, PortfolioAsset } from "@/lib/mock-data";
import { SPECIALTY_LABELS } from "@/lib/mock-data";

interface CoderProfilePopupProps {
  coder: Coder | null;
  onClose: () => void;
}

function ExternalIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function figmaEmbedUrl(url: string): string {
  return `https://www.figma.com/embed?embed_host=vibechckd&url=${encodeURIComponent(url)}`;
}

function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-muted pointer-events-none">
      <div className="relative w-8 h-8">
        <span className="absolute inset-0 rounded-full border-2 border-border" />
        <span className="absolute inset-0 rounded-full border-2 border-text-primary border-t-transparent border-r-transparent animate-spin" />
      </div>
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          {label}
        </span>
      )}
    </div>
  );
}

function IframePreview({
  src,
  title,
  sandbox,
  allowFullScreen,
  loadingLabel,
}: {
  src: string;
  title: string;
  sandbox?: string;
  allowFullScreen?: boolean;
  loadingLabel?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Some iframes (cross-origin, blocked by X-Frame-Options) never fire `load`.
  // Hide the spinner after a soft timeout so users aren't stuck looking at it.
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 8000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <div className="relative w-full aspect-video bg-white">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 w-full h-full"
        loading="lazy"
        sandbox={sandbox}
        allowFullScreen={allowFullScreen}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setErrored(true);
        }}
      />
      {!loaded && <LoadingOverlay label={loadingLabel || "Loading preview"} />}
      {errored && loaded && (
        <div className="absolute inset-x-0 bottom-0 px-3 py-1.5 bg-background/90 border-t border-border text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Preview unavailable — open in new tab
        </div>
      )}
    </div>
  );
}

function AssetPreview({ asset }: { asset: PortfolioAsset }) {
  if (asset.type === "live_preview") {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <div className="bg-surface-muted px-3 h-8 border-b border-border flex items-center gap-2">
          <div className="flex gap-1.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-[10px] font-mono text-text-muted truncate flex-1 text-center">
            {asset.url}
          </span>
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            aria-label="Open in new tab"
          >
            <ExternalIcon className="w-3.5 h-3.5" />
          </a>
        </div>
        <IframePreview
          src={asset.url}
          title={asset.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          loadingLabel="Loading preview"
        />
      </div>
    );
  }

  if (asset.type === "figma") {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-surface-muted">
        <div className="bg-surface-muted px-3 h-8 border-b border-border flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Figma</span>
          <span className="text-[11px] text-text-secondary truncate flex-1">{asset.title}</span>
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            aria-label="Open in Figma"
          >
            <ExternalIcon className="w-3.5 h-3.5" />
          </a>
        </div>
        <IframePreview
          src={figmaEmbedUrl(asset.url)}
          title={asset.title}
          allowFullScreen
          loadingLabel="Loading Figma"
        />
      </div>
    );
  }

  if (asset.type === "image") {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.url}
          alt={asset.title}
          loading="lazy"
          className="w-full h-auto block max-h-[70vh] object-contain bg-surface-muted"
        />
        {asset.title && (
          <p className="text-[11px] font-mono text-text-muted px-3 py-2 border-t border-border truncate">
            {asset.title}
          </p>
        )}
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-black">
        <video
          src={asset.url}
          controls
          preload="metadata"
          playsInline
          className="w-full h-auto block max-h-[70vh]"
        />
        {asset.title && (
          <p className="text-[11px] font-mono text-text-muted px-3 py-2 border-t border-border bg-background truncate">
            {asset.title}
          </p>
        )}
      </div>
    );
  }

  // pdf — link tile
  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-3 border border-border rounded-lg hover:border-border-hover hover:bg-background-alt transition-colors"
    >
      <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-mono font-medium text-text-muted">PDF</span>
      </div>
      <span className="text-[13px] text-text-primary flex-1 truncate">{asset.title}</span>
      <ExternalIcon className="w-3.5 h-3.5 text-text-muted" />
    </a>
  );
}

function ProjectThumb({
  item,
  active,
  onClick,
}: {
  item: PortfolioItem;
  active: boolean;
  onClick: () => void;
}) {
  const hasThumb = !!item.thumbnailUrl;
  const initial = item.title.charAt(0).toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`group flex-shrink-0 snap-start w-[160px] sm:w-[180px] text-left rounded-lg border transition-all duration-150 cursor-pointer overflow-hidden ${
        active
          ? "border-text-primary ring-1 ring-text-primary"
          : "border-border hover:border-border-hover"
      }`}
      aria-pressed={active}
    >
      <div className="relative aspect-video bg-surface-muted overflow-hidden">
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#f5f5f5,#e5e5e5)" }}
          >
            <span className="text-[36px] font-semibold text-text-muted/40 select-none">{initial}</span>
          </div>
        )}
        {item.assets.length > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center h-[18px] px-1.5 rounded bg-text-primary text-[9px] font-mono text-white tabular-nums">
            {item.assets.length}
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className={`text-[12px] truncate ${active ? "text-text-primary font-medium" : "text-text-primary"}`}>
          {item.title}
        </p>
      </div>
    </button>
  );
}

export default function CoderProfilePopup({ coder, onClose }: CoderProfilePopupProps) {
  const [activeProject, setActiveProject] = useState<PortfolioItem | null>(null);
  const router = useRouter();
  const { status: authStatus } = useSession();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [initiating, setInitiating] = useState<string | null>(null);

  const portfolio = useMemo(() => coder?.portfolio || [], [coder]);

  // Auto-select the first project when the modal opens / coder changes.
  useEffect(() => {
    if (coder && portfolio.length > 0) {
      setActiveProject(portfolio[0]);
    } else {
      setActiveProject(null);
    }
  }, [coder, portfolio]);

  // Lock body scroll while open
  useEffect(() => {
    if (!coder) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [coder]);

  // Close on Escape
  useEffect(() => {
    if (!coder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coder, onClose]);

  if (!coder) return null;

  const handleInquiry = async (type: "project" | "inquiry") => {
    if (authStatus !== "authenticated") {
      router.push("/register?role=client");
      return;
    }
    setInitiating(type);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coderId: coder.id, coderName: coder.displayName, type }),
      });
      const data = await res.json();
      if (data.projectId) {
        router.push(`/dashboard/projects/${data.projectId}`);
      }
    } catch {
      setInitiating(null);
    }
  };

  const specialties = coder.specialties || [];
  const skills = coder.skills || [];
  const location = coder.location || "Remote";
  const hourlyRate = coder.hourlyRate || "";
  const specialtyLabel = specialties[0]
    ? SPECIALTY_LABELS[specialties[0]] || specialties[0]
    : "Developer";
  const metaParts = [specialtyLabel, hourlyRate, location].filter(Boolean);

  const initialLetters = coder.displayName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  const liveAssets = (activeProject?.assets || []).filter((a) => a.type === "live_preview");
  const imageAssets = (activeProject?.assets || []).filter((a) => a.type === "image");
  const videoAssets = (activeProject?.assets || []).filter((a) => a.type === "video");
  const figmaAssets = (activeProject?.assets || []).filter((a) => a.type === "figma");
  const fileAssets = (activeProject?.assets || []).filter((a) => a.type === "pdf");

  return (
    <AnimatePresence>
      {coder && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${coder.displayName} profile`}
            className="relative bg-background border border-border w-full max-w-[1100px] sm:rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] flex flex-col h-full sm:h-auto sm:max-h-[calc(100vh-3rem)] sm:my-6 sm:mx-4 overflow-hidden"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button — floats top right, always reachable */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full bg-background border border-border hover:bg-surface-muted transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-4 h-4 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Body — scrollable; flex-col on mobile, side-by-side on lg */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] lg:gap-0">
                {/* Info column */}
                <aside className="p-5 sm:p-6 lg:p-7 lg:border-r lg:border-border flex flex-col">
                  <div className="flex items-start gap-3.5">
                    <div className="w-14 h-14 rounded-[10px] bg-surface-muted flex items-center justify-center text-[16px] font-semibold text-text-muted flex-shrink-0 overflow-hidden">
                      {coder.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coder.avatarUrl}
                          alt={coder.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initialLetters
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-[19px] sm:text-[20px] font-semibold text-text-primary tracking-[-0.02em] truncate">
                          {coder.displayName}
                        </h2>
                        {coder.verified && <Badge variant="verified" />}
                        <FavoriteButton
                          favorited={isFavorited(coder.id)}
                          onClick={() => toggleFavorite(coder.id)}
                          size="sm"
                          className="ml-1"
                        />
                      </div>
                      <p className="text-[12px] font-mono text-text-muted mt-1 truncate">
                        {metaParts.join(" · ")}
                      </p>
                    </div>
                  </div>

                  {coder.bio && (
                    <p className="text-[13px] text-text-secondary mt-4 leading-[1.65]">
                      {coder.bio}
                    </p>
                  )}

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {skills.map((skill) => (
                        <Tag key={skill}>{skill}</Tag>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-5">
                    <Button onClick={() => handleInquiry("project")} disabled={!!initiating}>
                      {initiating === "project" ? "Starting..." : "Start project"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleInquiry("inquiry")}
                      disabled={!!initiating}
                    >
                      {initiating === "inquiry" ? "Sending..." : "Send inquiry"}
                    </Button>
                    <div className="hidden sm:block flex-1" />
                    <Badge variant={coder.availability || "available"} />
                  </div>

                  {(coder.githubUrl || coder.twitterUrl || coder.linkedinUrl || coder.websiteUrl) && (
                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                      {coder.githubUrl && (
                        <a
                          href={coder.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-text-primary transition-colors"
                          aria-label="GitHub"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        </a>
                      )}
                      {coder.twitterUrl && (
                        <a
                          href={coder.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-text-primary transition-colors"
                          aria-label="Twitter / X"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                      {coder.linkedinUrl && (
                        <a
                          href={coder.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-text-primary transition-colors"
                          aria-label="LinkedIn"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                        </a>
                      )}
                      {coder.websiteUrl && (
                        <a
                          href={coder.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-text-primary transition-colors"
                          aria-label="Website"
                        >
                          <ExternalIcon className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </aside>

                {/* Preview column */}
                <section className="flex flex-col bg-background-alt/40 lg:bg-transparent border-t lg:border-t-0 border-border min-w-0">
                  {portfolio.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8 min-h-[280px]">
                      <p className="text-[12px] font-mono text-text-muted">No work shared yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Project selector */}
                      <div className="px-5 sm:px-6 lg:px-7 pt-5 pb-4 border-b border-border">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2.5">
                          Work · {portfolio.length}
                        </p>
                        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 snap-x snap-proximity">
                          {portfolio.map((item) => (
                            <ProjectThumb
                              key={item.id}
                              item={item}
                              active={activeProject?.id === item.id}
                              onClick={() => setActiveProject(item)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Active project preview */}
                      <div className="flex-1 px-5 sm:px-6 lg:px-7 py-5">
                        <AnimatePresence mode="wait">
                          {activeProject && (
                            <motion.div
                              key={activeProject.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.18 }}
                            >
                              <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">
                                {activeProject.title}
                              </h3>
                              {activeProject.description && (
                                <p className="text-[13px] text-text-secondary mt-1.5 leading-[1.6]">
                                  {activeProject.description}
                                </p>
                              )}

                              <div className="mt-4 space-y-3">
                                {liveAssets.map((asset) => (
                                  <AssetPreview key={asset.id} asset={asset} />
                                ))}
                                {imageAssets.map((asset) => (
                                  <AssetPreview key={asset.id} asset={asset} />
                                ))}
                                {videoAssets.map((asset) => (
                                  <AssetPreview key={asset.id} asset={asset} />
                                ))}
                                {figmaAssets.map((asset) => (
                                  <AssetPreview key={asset.id} asset={asset} />
                                ))}
                                {fileAssets.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                                      Files
                                    </p>
                                    {fileAssets.map((asset) => (
                                      <AssetPreview key={asset.id} asset={asset} />
                                    ))}
                                  </div>
                                )}
                                {activeProject.assets.length === 0 && (
                                  <div className="border border-dashed border-border rounded-lg p-8 text-center">
                                    <p className="text-[12px] font-mono text-text-muted">
                                      No previews attached.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
