"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Badge from "./Badge";
import type { Coder, Specialty } from "@/lib/mock-data";
import { SPECIALTY_LABELS } from "@/lib/mock-data";

interface TeamMember {
  specialty: Specialty;
  coder: Coder;
}

interface TeamAssembledProps {
  team: TeamMember[];
  onReset: () => void;
}

export default function TeamAssembled({ team, onReset }: TeamAssembledProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      className="border border-[#e5e5e5] rounded-[10px] p-6 mt-4"
    >
      <h3 className="text-[14px] font-medium text-[#0a0a0a] mb-5 text-center">Team Assembled</h3>

      <div className="flex flex-wrap justify-center gap-8 mb-6">
        {team.map((member, i) => {
          const hasPfp = member.coder.avatarUrl?.startsWith("/pfp/");
          return (
            <motion.div
              key={member.coder.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#e5e5e5]">
                {hasPfp ? (
                  <img
                    src={member.coder.avatarUrl}
                    alt={member.coder.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#f5f5f5] flex items-center justify-center text-[14px] font-medium text-[#d4d4d4]">
                    {member.coder.displayName.split(" ").map(n => n[0]).join("")}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-medium text-[#0a0a0a]">{member.coder.displayName}</span>
                {member.coder.verified && <Badge variant="verified" />}
              </div>
              <span className="text-[11px] text-[#a3a3a3] font-mono uppercase tracking-[0.06em]">
                {SPECIALTY_LABELS[member.specialty]}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/dashboard/projects/1"
          className="inline-flex items-center justify-center px-[22px] py-2.5 text-[13px] font-medium bg-[#171717] text-[#fafafa] rounded-lg hover:bg-[#0a0a0a] transition-colors"
        >
          Initiate project
        </Link>
        <button
          onClick={onReset}
          className="text-[12px] text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>
    </motion.div>
  );
}
