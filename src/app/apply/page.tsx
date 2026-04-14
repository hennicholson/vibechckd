"use client";

import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import ApplicationForm from "@/components/ApplicationForm";

export default function ApplyPage() {
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-[30px] font-semibold text-text-primary tracking-[-0.03em]">
            Apply to become a verified coder
          </h1>
          <p className="text-[14px] text-text-muted mt-2 max-w-md mx-auto">
            Every coder on vibechckd goes through our AI-assisted vetting process.
            We evaluate craft, taste, and technical quality.
          </p>
          <p className="text-[12px] text-text-muted mt-3">
            Applications are reviewed within 3-5 business days.
          </p>
        </motion.div>

        <ApplicationForm />
      </div>
    </PageShell>
  );
}
