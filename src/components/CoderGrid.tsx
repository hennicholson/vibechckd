"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CoderCard from "./CoderCard";
import CoderCardExpanded from "./CoderCardExpanded";
import type { Coder } from "@/lib/mock-data";

interface CoderGridProps {
  coders: Coder[];
}

export default function CoderGrid({ coders }: CoderGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const selectedCoder = selectedId ? coders.find(c => c.id === selectedId) : null;
  const otherCoders = selectedId ? coders.filter(c => c.id !== selectedId) : [];

  // Scroll strip to start when selection changes
  useEffect(() => {
    if (selectedId && stripRef.current) {
      stripRef.current.scrollLeft = 0;
    }
  }, [selectedId]);

  if (coders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-text-muted">No coders found matching your criteria.</p>
      </div>
    );
  }

  if (selectedCoder) {
    return (
      <div className="border border-border rounded-[10px] overflow-hidden">
        {/* Expanded card — full width */}
        <AnimatePresence mode="wait">
          <CoderCardExpanded
            key={selectedCoder.id}
            coder={selectedCoder}
            onClose={() => setSelectedId(null)}
          />
        </AnimatePresence>

        {/* Horizontal strip of other coders */}
        {otherCoders.length > 0 && (
          <div className="border-t border-border">
            <div
              ref={stripRef}
              className="flex overflow-x-auto scrollbar-hide"
            >
              {otherCoders.map((coder, i) => (
                <CoderCard
                  key={coder.id}
                  coder={coder}
                  index={i}
                  onClick={() => setSelectedId(coder.id)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        layout
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {coders.map((coder, i) => (
          <motion.div
            key={coder.id}
            layout
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <CoderCard
              coder={coder}
              index={i}
              onClick={() => setSelectedId(coder.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
