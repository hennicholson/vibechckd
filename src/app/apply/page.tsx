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
            Apply to join vibechckd
          </h1>
          <p className="text-[14px] text-text-muted mt-2">
            We&apos;re looking for craft, taste, and technical quality.
          </p>
        </motion.div>

        <ApplicationForm />
      </div>
    </PageShell>
  );
}
