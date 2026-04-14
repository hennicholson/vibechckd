"use client";

import { motion } from "framer-motion";
import TeamBuilder from "@/components/TeamBuilder";

export default function TeamBuilderPage() {
  return (
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[30px] font-semibold text-[#0a0a0a] tracking-[-0.03em]">
            Build your team
          </h1>
          <p className="text-[14px] text-[#a3a3a3] mt-2 max-w-[460px] mx-auto leading-[1.6]">
            Assemble a vetted team of verified coders across frontend, backend, and security to ship your project with confidence.
          </p>
        </motion.div>

        <TeamBuilder />
      </div>
  );
}
