"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterBar({ options, value, onChange, className = "" }: FilterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicator({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [value]);

  return (
    <div ref={containerRef} className={`relative flex border-b border-border ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          data-value={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3.5 py-2 text-[13px] transition-colors duration-150 cursor-pointer -mb-px border-b-[1.5px] border-transparent ${
            value === option.value
              ? "text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {option.label}
        </button>
      ))}
      <motion.div
        className="absolute bottom-0 h-[1.5px] bg-text-primary"
        animate={{ left: indicator.left, width: indicator.width }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </div>
  );
}
