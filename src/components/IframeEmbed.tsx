"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface IframeEmbedProps {
  url: string;
  title: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  className?: string;
}

export default function IframeEmbed({
  url,
  title,
  thumbnailUrl,
  aspectRatio = "16/10",
  className = "",
}: IframeEmbedProps) {
  const [interactive, setInteractive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleOverlayClick = useCallback(() => {
    setInteractive(true);
  }, []);

  const handleClickOutside = useCallback(() => {
    setInteractive(false);
  }, []);

  // Timeout fallback: if the iframe hasn't loaded within 8s, show error state
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!loaded) {
        setError(true);
      }
    }, 8000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loaded]);

  if (error) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden bg-surface border border-border-card ${className}`}
        style={{ aspectRatio }}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-surface-muted">
            <svg className="w-10 h-10 text-border" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <p className="text-text-muted font-body text-sm">
              Preview unavailable
            </p>
          </div>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors duration-300"
        >
          <span className="bg-surface px-4 py-2 rounded-xl font-body text-sm font-medium text-accent shadow-[0_2px_8px_rgba(0,0,0,0.08)] opacity-0 hover:opacity-100 transition-opacity duration-300">
            View Live &rarr;
          </span>
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-border-card bg-surface ${className}`}
      style={{ aspectRatio }}
      onBlur={handleClickOutside}
    >
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-surface-muted flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
            <span className="font-mono text-xs text-text-muted">Loading preview</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={url}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        className={`w-full h-full transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: interactive ? "auto" : "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />

      {/* Interaction overlay */}
      {!interactive && loaded && (
        <motion.div
          className="absolute inset-0 cursor-pointer group"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors duration-300" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="font-mono text-xs text-text-secondary">Click to interact</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
