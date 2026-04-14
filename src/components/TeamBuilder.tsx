"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TeamSlot from "./TeamSlot";
import TeamAssembled from "./TeamAssembled";
import CoderCard from "./CoderCard";
import type { Coder, Specialty } from "@/lib/mock-data";
import { coders, SPECIALTY_LABELS, getCodersBySpecialty } from "@/lib/mock-data";

type SlotConfig = {
  specialty: Specialty;
  label: string;
};

const SLOTS: SlotConfig[] = [
  { specialty: "frontend", label: "Frontend" },
  { specialty: "backend", label: "Backend" },
  { specialty: "security", label: "Security" },
];

export default function TeamBuilder() {
  const [team, setTeam] = useState<Record<string, Coder | null>>({
    frontend: null,
    backend: null,
    security: null,
  });
  const [browsingSlot, setBrowsingSlot] = useState<Specialty | null>(null);
  const [initiated, setInitiated] = useState(false);

  const filledSlots = Object.entries(team).filter(([, coder]) => coder !== null);
  const filledCount = filledSlots.length;
  const hasAnySelection = filledCount > 0;

  const handleBrowse = (specialty: Specialty) => {
    setBrowsingSlot((prev) => (prev === specialty ? null : specialty));
  };

  const handleSelectCoder = (coder: Coder) => {
    if (!browsingSlot) return;
    setTeam((prev) => ({ ...prev, [browsingSlot]: coder }));
    setBrowsingSlot(null);
  };

  const handleRemoveCoder = (specialty: string) => {
    setTeam((prev) => ({ ...prev, [specialty]: null }));
    setInitiated(false);
  };

  const handleReset = () => {
    setTeam({ frontend: null, backend: null, security: null });
    setInitiated(false);
    setBrowsingSlot(null);
  };

  const handleInitiate = () => {
    setInitiated(true);
    setBrowsingSlot(null);
  };

  const selectedIds = new Set(Object.values(team).filter(Boolean).map((c) => c!.id));
  const availableCoders = browsingSlot
    ? getCodersBySpecialty(browsingSlot).filter((c) => !selectedIds.has(c.id))
    : [];
  const browsableCoders = availableCoders.length > 0
    ? availableCoders
    : browsingSlot
      ? coders.filter((c) => !selectedIds.has(c.id))
      : [];

  const assembledTeam = filledSlots.map(([specialty, coder]) => ({
    specialty: specialty as Specialty,
    coder: coder!,
  }));

  return (
    <div>
      {/* Slots */}
      <div className="flex flex-wrap justify-center gap-4 mb-4">
        {SLOTS.map((slot) => (
          <TeamSlot
            key={slot.specialty}
            coder={team[slot.specialty]}
            specialty={slot.label}
            isActive={browsingSlot === slot.specialty}
            onBrowse={() => handleBrowse(slot.specialty)}
            onRemove={team[slot.specialty] ? () => handleRemoveCoder(slot.specialty) : undefined}
          />
        ))}
      </div>

      {/* Counter */}
      <p className="text-center text-[12px] text-[#a3a3a3] font-mono mb-6">
        {filledCount} of 3 roles filled
      </p>

      {/* Initiate button */}
      {hasAnySelection && !initiated && (
        <div className="text-center mb-8">
          <button
            onClick={handleInitiate}
            className="px-[22px] py-2.5 text-[13px] font-medium bg-[#171717] text-[#fafafa] rounded-lg cursor-pointer hover:bg-[#0a0a0a] transition-colors"
          >
            Initiate project
          </button>
        </div>
      )}

      {/* Inline coder gallery */}
      <AnimatePresence>
        {browsingSlot && !initiated && browsableCoders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden mb-8"
          >
            <div className="border border-[#e5e5e5] rounded-[10px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
                <span className="text-[12px] text-[#a3a3a3] font-mono uppercase tracking-[0.06em]">
                  {SPECIALTY_LABELS[browsingSlot]} coders
                </span>
                <button
                  onClick={() => setBrowsingSlot(null)}
                  className="text-[12px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {browsableCoders.map((coder, i) => (
                  <CoderCard
                    key={coder.id}
                    coder={coder}
                    index={i}
                    onClick={() => handleSelectCoder(coder)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assembled team */}
      <AnimatePresence>
        {initiated && assembledTeam.length > 0 && (
          <TeamAssembled
            team={assembledTeam}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
