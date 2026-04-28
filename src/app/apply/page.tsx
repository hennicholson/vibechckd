"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ApplicationForm from "@/components/ApplicationForm";

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !!session?.user;

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-[24px] md:text-[30px] font-semibold text-text-primary tracking-[-0.03em]">
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

        {/* Sign-in nudge for anonymous applicants — without an account we can't
            link the application to a user, so they can't track their status. */}
        {status !== "loading" && !isSignedIn && (
          <div className="mb-6 border border-border rounded-[10px] p-4 bg-background-alt">
            <p className="text-[13px] text-text-primary font-medium mb-1">
              Create an account to track your application
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed mb-3">
              Sign up as a creator first so you can check your application status anytime, and we can let you know when you're approved.
            </p>
            <div className="flex gap-2">
              <Link
                href="/register?role=coder"
                className="inline-flex items-center h-8 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                Create account
              </Link>
              <Link
                href="/login?next=/apply"
                className="inline-flex items-center h-8 px-3 rounded-md border border-border text-[12px] text-text-secondary hover:bg-background transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        <ApplicationForm
          initialName={session?.user?.name || ""}
          initialEmail={session?.user?.email || ""}
        />

        {isSignedIn && (
          <p className="text-[12px] text-text-muted text-center mt-8">
            Already applied?{" "}
            <Link
              href="/dashboard/application"
              className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
            >
              Check your application status
            </Link>
          </p>
        )}
      </div>
    </PageShell>
  );
}
