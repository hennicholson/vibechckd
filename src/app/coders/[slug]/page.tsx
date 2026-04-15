"use client";

import { use, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PageShell from "@/components/PageShell";
import Badge from "@/components/Badge";
import Tag from "@/components/Tag";
import Button from "@/components/Button";
import PortfolioGrid from "@/components/PortfolioGrid";
import PortfolioFolder from "@/components/PortfolioFolder";
import Modal from "@/components/Modal";
import { getCoderBySlug as getMockCoder, SPECIALTY_LABELS, type Coder, type PortfolioItem } from "@/lib/mock-data";

function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export default function CoderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: session, status: authStatus } = useSession();
  const [coder, setCoder] = useState<Coder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [inquiryToast, setInquiryToast] = useState(false);
  const [initiating, setInitiating] = useState<string | null>(null);

  const handleInquiry = async (type: "project" | "inquiry") => {
    if (authStatus !== "authenticated" || !coder) {
      window.location.href = "/register?role=client";
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
        window.location.href = `/dashboard/projects/${data.projectId}`;
      }
    } catch {
      setInitiating(null);
    }
  };

  // Set document title
  useEffect(() => {
    if (coder) {
      document.title = `${coder.displayName} \u2014 vibechckd`;
    } else {
      document.title = "vibechckd";
    }
    return () => { document.title = "vibechckd"; };
  }, [coder]);

  // Fetch coder from API, fall back to mock data
  useEffect(() => {
    let cancelled = false;

    async function fetchCoder() {
      setLoading(true);
      try {
        const res = await fetch("/api/coders");
        if (res.ok) {
          const coders = await res.json();
          const found = coders.find((c: Coder) => c.slug === slug);
          if (!cancelled) {
            if (found) {
              setCoder(found);
            } else {
              // Try mock data as final fallback
              const mock = getMockCoder(slug);
              if (mock) {
                setCoder(mock);
              } else {
                setNotFound(true);
              }
            }
          }
        } else {
          // API failed, try mock data
          if (!cancelled) {
            const mock = getMockCoder(slug);
            if (mock) {
              setCoder(mock);
            } else {
              setNotFound(true);
            }
          }
        }
      } catch {
        if (!cancelled) {
          const mock = getMockCoder(slug);
          if (mock) {
            setCoder(mock);
          } else {
            setNotFound(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCoder();
    return () => { cancelled = true; };
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <PageShell>
        <div className="max-w-[960px] mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row gap-10 animate-pulse">
            <div className="w-full md:w-[320px] flex-shrink-0">
              <div className="w-[120px] h-[120px] rounded-[10px] bg-[#f5f5f5]" />
              <div className="h-5 w-40 bg-[#f5f5f5] rounded mt-4" />
              <div className="h-3 w-32 bg-[#f5f5f5] rounded mt-2" />
              <div className="h-3 w-24 bg-[#f5f5f5] rounded mt-1.5" />
              <div className="h-16 w-full bg-[#f5f5f5] rounded mt-4" />
              <div className="flex gap-1.5 mt-4">
                {[1,2,3,4].map(i => <div key={i} className="h-6 w-16 bg-[#f5f5f5] rounded" />)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-3 w-12 bg-[#f5f5f5] rounded mb-4" />
              {[1,2,3].map(i => <div key={i} className="h-20 w-full bg-[#f5f5f5] rounded mb-3" />)}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // 404 state
  if (notFound || !coder) {
    return (
      <PageShell>
        <div className="max-w-[960px] mx-auto px-6 py-24 text-center">
          <div className="w-12 h-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-[#0a0a0a]">Coder not found</h1>
          <p className="text-[14px] text-[#737373] mt-2">This profile doesn&apos;t exist or has been removed.</p>
          <Link href="/browse">
            <Button variant="secondary" className="mt-6">Browse coders</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const specialtyLabel = coder.specialties?.[0]
    ? SPECIALTY_LABELS[coder.specialties[0] as keyof typeof SPECIALTY_LABELS] || coder.specialties[0]
    : "";

  return (
    <PageShell>
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <motion.div
          className="flex flex-col md:flex-row gap-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left column -- Profile info */}
          <div className="w-full md:w-[320px] flex-shrink-0">
            {/* Avatar */}
            <div className="w-[120px] h-[120px] rounded-[10px] overflow-hidden bg-[#f5f5f5] pfp-static">
              {coder.avatarUrl ? (
                <img
                  src={coder.avatarUrl}
                  alt={coder.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[32px] font-semibold text-[#a3a3a3]">
                  {coder.displayName.charAt(0)}
                </div>
              )}
            </div>

            {/* Name + verified */}
            <div className="flex items-center gap-2 mt-4">
              <h1 className="text-[20px] font-semibold text-[#0a0a0a] tracking-[-0.02em]">
                {coder.displayName}
              </h1>
              {coder.verified && <Badge variant="verified" />}
            </div>

            {/* Specialty, rate, location */}
            {(specialtyLabel || coder.hourlyRate) && (
              <p className="text-[13px] text-[#737373] mt-1">
                {[specialtyLabel, coder.hourlyRate].filter(Boolean).join(" \u00b7 ")}
              </p>
            )}
            {coder.location && (
              <p className="text-[13px] text-[#737373] mt-0.5">
                {coder.location}
              </p>
            )}

            {/* Bio */}
            {coder.bio && (
              <p className="text-[14px] text-[#404040] mt-4 leading-[1.65]">
                {coder.bio}
              </p>
            )}

            {/* Tags */}
            {coder.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {coder.skills.map((skill) => (
                  <Tag key={skill}>{skill}</Tag>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex gap-2 mt-5">
              <Button onClick={() => handleInquiry("project")} disabled={!!initiating}>
                {initiating === "project" ? "Starting..." : "Start project"}
              </Button>
              <Button variant="secondary" onClick={() => handleInquiry("inquiry")} disabled={!!initiating}>
                {initiating === "inquiry" ? "Sending..." : "Send inquiry"}
              </Button>
            </div>

            {/* Inquiry toast */}
            {inquiryToast && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 px-3 py-2 text-[12px] text-[#737373] bg-[#fafafa] border border-[#e5e5e5] rounded-md"
              >
                Messaging is coming soon.
              </motion.div>
            )}

            {/* Social links */}
            <div className="flex gap-2 mt-4">
              {coder.githubUrl && (
                <a
                  href={ensureHttps(coder.githubUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors duration-150"
                  aria-label="GitHub"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              )}
              {coder.twitterUrl && (
                <a
                  href={ensureHttps(coder.twitterUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors duration-150"
                  aria-label="X / Twitter"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {coder.linkedinUrl && (
                <a
                  href={ensureHttps(coder.linkedinUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors duration-150"
                  aria-label="LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              )}
              {coder.websiteUrl && (
                <a
                  href={ensureHttps(coder.websiteUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#f5f5f5] transition-colors duration-150"
                  aria-label="Website"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Right column -- Work */}
          <div className="flex-1 min-w-0">
            {coder.portfolio.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <p className="text-[11px] font-mono text-[#a3a3a3] uppercase tracking-[0.08em] mb-4">Work</p>
                <PortfolioGrid items={coder.portfolio} onItemClick={setSelectedItem} layout="list" />
              </motion.div>
            )}

            {coder.portfolio.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                  <svg className="w-4 h-4 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#737373]">No portfolio items yet.</p>
              </div>
            )}
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
