"use client";

/**
 * BrowseSearchBar — Command-palette-styled search input.
 *
 * - Prominent thin border, rounded-md, white bg, subtle shadow
 * - Magnifier icon on the left
 * - ⌘K indicator chip on the right (desktop only)
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
      // Cmd-K / Ctrl-K focuses search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      // Escape clears focus when input is focused
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
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m1.95-5.05a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-10 pr-20 text-[14px] text-text-primary bg-white border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:border-text-primary/40 focus:shadow-[0_0_0_3px_rgba(10,10,10,0.04)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-150"
        aria-label="Search coders"
      />
      {/* ⌘K chip — only render on >= sm to keep mobile clean */}
      <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center pointer-events-none">
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            onMouseDown={(e) => e.preventDefault()}
            className="pointer-events-auto text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1 -mr-1"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd className="inline-flex items-center gap-0.5 h-[22px] px-1.5 text-[10px] font-medium text-text-muted bg-background-alt border border-border rounded tracking-[0.04em]">
            <span className="text-[11px] leading-none">⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>
    </div>
  );
}
