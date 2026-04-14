"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Badge from "./Badge";
import Tag from "./Tag";
import Button from "./Button";
import type { Coder, PortfolioItem, PortfolioAsset } from "@/lib/mock-data";
import { SPECIALTY_LABELS } from "@/lib/mock-data";

const assetLabels: Record<PortfolioAsset["type"], string> = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  live_preview: "Live",
  figma: "Figma",
};

interface CoderCardExpandedProps {
  coder: Coder;
  onClose: () => void;
}

export default function CoderCardExpanded({ coder, onClose }: CoderCardExpandedProps) {
  const [activeProject, setActiveProject] = useState<PortfolioItem | null>(coder.portfolio[0] || null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="border-b border-border"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-alt">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {coder.avatarUrl.startsWith("/pfp/") ? (
              <img src={coder.avatarUrl} alt={coder.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[12px] font-medium text-border-hover">
                {coder.displayName.split(" ").map(n => n[0]).join("")}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-text-primary">{coder.displayName}</span>
              {coder.verified && <Badge variant="verified" size="sm" />}
            </div>
            <span className="text-[11px] text-text-muted">
              {SPECIALTY_LABELS[coder.specialties[0]]} &middot; {coder.hourlyRate} &middot; {coder.location}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-[280px_1fr]"
      >
        {/* Left: Bio + Tags + Actions */}
        <div className="p-5 lg:border-r border-border">
          <p className="text-[13px] text-text-secondary leading-[1.6]">
            {coder.bio}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {coder.skills.map((skill) => (
              <Tag key={skill}>{skill}</Tag>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button>Start project</Button>
            <Button variant="secondary">Send inquiry</Button>
          </div>

          {/* Social */}
          <div className="flex gap-3 mt-3">
            {coder.githubUrl && (
              <a href={coder.githubUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            )}
            {coder.twitterUrl && (
              <a href={coder.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            )}
            {coder.linkedinUrl && (
              <a href={coder.linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            )}
            {coder.websiteUrl && (
              <a href={coder.websiteUrl} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <div className="ml-auto">
              <Badge variant={coder.availability} />
            </div>
          </div>
        </div>

        {/* Right: Portfolio */}
        <div className="min-h-[280px]">
          {coder.portfolio.length > 0 && (
            <>
              {/* Project Tabs */}
              <div className="flex border-b border-border px-3">
                {coder.portfolio.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveProject(activeProject?.id === item.id ? null : item)}
                    className={`px-3 py-2 text-[12px] transition-colors duration-150 cursor-pointer -mb-px border-b-2 ${
                      activeProject?.id === item.id
                        ? "text-text-primary font-medium border-text-primary"
                        : "text-text-muted border-transparent hover:text-text-secondary"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              {/* Project Content */}
              <AnimatePresence mode="wait">
                {activeProject ? (
                  <motion.div
                    key={activeProject.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3"
                  >
                    <p className="text-[12px] text-text-secondary mb-2">{activeProject.description}</p>

                    {/* Live preview iframes */}
                    {activeProject.assets.filter(a => a.type === "live_preview").map((asset) => (
                      <div key={asset.id} className="mb-2">
                        <div className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-surface-muted px-3 py-1 border-b border-border flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-[6px] h-[6px] rounded-full bg-border-hover" />
                              <div className="w-[6px] h-[6px] rounded-full bg-border-hover" />
                              <div className="w-[6px] h-[6px] rounded-full bg-border-hover" />
                            </div>
                            <span className="text-[10px] text-text-muted font-mono truncate flex-1">{asset.url}</span>
                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                          <iframe
                            src={asset.url}
                            title={asset.title}
                            className="w-full h-[320px] bg-white"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Other assets */}
                    {activeProject.assets.filter(a => a.type !== "live_preview").length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
                        {activeProject.assets.filter(a => a.type !== "live_preview").map((asset, i, arr) => (
                          <a
                            key={asset.id}
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 px-3 py-1.5 hover:bg-background-alt transition-colors duration-150 ${
                              i < arr.length - 1 ? "border-b border-surface-muted" : ""
                            }`}
                          >
                            <span className="text-[12px] text-text-primary flex-1">{asset.title}</span>
                            <span className="text-[10px] text-text-muted font-mono">{assetLabels[asset.type]}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-[200px]"
                  >
                    <p className="text-[12px] text-text-muted">Select a project to preview</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
