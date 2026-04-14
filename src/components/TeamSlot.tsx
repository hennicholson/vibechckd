"use client";

import { motion, AnimatePresence } from "framer-motion";
import Badge from "./Badge";
import type { Coder } from "@/lib/mock-data";

interface TeamSlotProps {
  coder?: Coder | null;
  specialty: string;
  onBrowse: () => void;
  onRemove?: () => void;
  isActive?: boolean;
}

export default function TeamSlot({ coder, specialty, onBrowse, onRemove, isActive = false }: TeamSlotProps) {
  const hasPfp = coder?.avatarUrl?.startsWith("/pfp/");

  return (
    <div
      className={`w-[200px] border rounded-[10px] p-5 text-center transition-colors duration-200 ${
        isActive ? "border-[#171717]" : "border-[#e5e5e5] hover:border-[#d4d4d4]"
      }`}
    >
      <AnimatePresence mode="wait">
        {coder ? (
          <motion.div
            key="filled"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="w-16 h-16 rounded-full border border-[#e5e5e5] mx-auto overflow-hidden">
              {hasPfp ? (
                <img
                  src={coder.avatarUrl}
                  alt={coder.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center text-[18px] font-medium text-[#d4d4d4]">
                  {coder.displayName.split(" ").map(n => n[0]).join("")}
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[13px] font-medium text-[#0a0a0a]">{coder.displayName}</span>
                {coder.verified && <Badge variant="verified" />}
              </div>
              <p className="text-[11px] text-[#a3a3a3] font-mono uppercase tracking-[0.06em] mt-1">{specialty}</p>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-[12px] text-[#a3a3a3] underline mt-2.5 cursor-pointer hover:text-[#0a0a0a] transition-colors"
              >
                Remove
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <button
              onClick={onBrowse}
              className={`w-16 h-16 mx-auto border-[1.5px] border-dashed rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                isActive ? "border-[#171717]" : "border-[#d4d4d4] hover:border-[#a3a3a3] hover:bg-[#fafafa]"
              }`}
            >
              <svg className="w-5 h-5 text-[#a3a3a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <p className="text-[11px] text-[#a3a3a3] font-mono uppercase tracking-[0.06em] mt-3">{specialty}</p>
            <button
              onClick={onBrowse}
              className="text-[12px] text-[#a3a3a3] mt-1 cursor-pointer hover:text-[#0a0a0a] transition-colors"
            >
              Browse Gallery
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
