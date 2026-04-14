"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import Badge from "@/components/Badge";
import Tag from "@/components/Tag";
import Button from "@/components/Button";
import PortfolioGrid from "@/components/PortfolioGrid";
import PortfolioFolder from "@/components/PortfolioFolder";
import Modal from "@/components/Modal";
import { getCoderBySlug, SPECIALTY_LABELS, type PortfolioItem } from "@/lib/mock-data";

const mockFiles = [
  { name: "client_logos.png", size: "2.4 MB" },
  { name: "events.xy", size: "840 KB" },
  { name: "clients_xyz.PDF", size: "1.1 MB" },
];

export default function CoderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const coder = getCoderBySlug(slug);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

  if (!coder) {
    return (
      <PageShell>
        <div className="max-w-[960px] mx-auto px-6 py-24 text-center">
          <h1 className="text-[20px] font-semibold text-text-primary">Coder not found</h1>
          <p className="text-[14px] text-text-muted mt-2">This profile doesn&apos;t exist.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <motion.div
          className="flex flex-col md:flex-row gap-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left column — Profile info */}
          <div className="w-full md:w-[320px] flex-shrink-0">
            {/* Avatar */}
            <div className="w-[120px] h-[120px] rounded-[10px] overflow-hidden bg-surface-muted pfp-static">
              <img
                src={coder.avatarUrl}
                alt={coder.displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name + verified */}
            <div className="flex items-center gap-2 mt-4">
              <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
                {coder.displayName}
              </h1>
              {coder.verified && <Badge variant="verified" />}
            </div>

            {/* Specialty, rate, location */}
            <p className="text-[13px] text-text-muted mt-1">
              {SPECIALTY_LABELS[coder.specialties[0]]} &middot; {coder.hourlyRate}
            </p>
            <p className="text-[13px] text-text-muted mt-0.5">
              {coder.location}
            </p>

            {/* Bio */}
            <p className="text-[14px] text-text-secondary mt-4 leading-[1.65]">
              {coder.bio}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {coder.skills.map((skill) => (
                <Tag key={skill}>{skill}</Tag>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex gap-2 mt-5">
              <Button>Start project</Button>
              <Button variant="secondary">Send inquiry</Button>
            </div>

            {/* Social links */}
            <div className="flex gap-2 mt-4">
              {coder.githubUrl && (
                <a
                  href={coder.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {coder.twitterUrl && (
                <a
                  href={coder.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {coder.linkedinUrl && (
                <a
                  href={coder.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}
              {coder.websiteUrl && (
                <a
                  href={coder.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Right column — Work */}
          <div className="flex-1 min-w-0">
            {coder.portfolio.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-4">Work</p>
                <PortfolioGrid items={coder.portfolio} onItemClick={setSelectedItem} layout="list" />
              </motion.div>
            )}

            {/* Upload Work — mock file management area */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-4">Upload work</p>
              <div className="border border-border rounded-[10px] overflow-hidden">
                {/* Drag-drop area */}
                <div className="px-4 py-6 border-b border-border flex flex-col items-center justify-center gap-2 bg-background-alt">
                  <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center">
                    <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-[12px] text-text-muted">Drag and drop files here</p>
                </div>

                {/* File listings */}
                {mockFiles.map((file, i) => (
                  <div
                    key={file.name}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < mockFiles.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{file.name}</p>
                      <p className="text-[11px] text-text-muted">{file.size}</p>
                    </div>
                    <button className="text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer px-2 py-1 rounded-md hover:bg-surface-muted">
                      View
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        <Modal open={selectedItem !== null} onClose={() => setSelectedItem(null)} size="lg">
          {selectedItem && (
            <PortfolioFolder
              item={selectedItem}
              onBack={() => setSelectedItem(null)}
            />
          )}
        </Modal>
      </div>
    </PageShell>
  );
}
