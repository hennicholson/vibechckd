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
  placeholder = "Search creators, skills, or work…",
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
    // Borderless typographic search. The whole row reads like a single
    // line of intent — magnifier, the user's words, a clear button when
    // they have text. No box, no kbd hint, no chrome. The visual weight
    // comes from the type itself, not a container.
    <div className="relative group flex items-center gap-3 md:gap-4 py-1">
      <svg
        className="w-5 h-5 md:w-[22px] md:h-[22px] text-text-muted flex-shrink-0 transition-colors group-focus-within:text-text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m1.95-5.05a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[18px] md:text-[22px] tracking-[-0.01em] text-text-primary placeholder:text-text-muted/70 placeholder:font-normal py-2 md:py-3"
        aria-label="Search coders"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
