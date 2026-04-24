"use client";

/**
 * BrowseSearchBar — Slim command-palette-styled search input.
 *
 * - Plain border, rounded-md, no shadow (matches dashboard inputs)
 * - Magnifier icon left, ⌘K chip right (desktop only)
 * - Binds ⌘K / Ctrl-K globally to focus the input
 */

import { useEffect, useRef } from "react";

interface BrowseSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function BrowseSearchBar({
  value,
  onChange,
  placeholder = "Search by name, specialty, stack, or project...",
}: BrowseSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative group">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.6}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m1.95-5.05a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-16 text-[13px] text-text-primary bg-background border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:border-border-hover transition-colors duration-150"
        aria-label="Search coders"
      />
      <div className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center pointer-events-none">
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            onMouseDown={(e) => e.preventDefault()}
            className="pointer-events-auto text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd className="inline-flex items-center gap-0.5 h-[20px] px-1.5 text-[10px] font-mono text-text-muted bg-surface-muted border border-border rounded">
            <span className="text-[11px] leading-none">⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>
    </div>
  );
}
