"use client";

import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ApplicationForm from "@/components/ApplicationForm";
import PageIntroOverlay from "@/components/PageIntroOverlay";
import { usePageIntro } from "@/lib/use-page-intro";

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !!session?.user;
  // VETTED brand intro plays once per session — sets the tone before the
  // creator starts filling in the application. Matches the /browse intro
  // and dashboard tab intros so the surface feels part of one product.
  const [showIntro, doneIntro] = usePageIntro("intro:apply");

  return (
    <PageShell>
      {/* `relative` anchors the PageIntroOverlay so it covers just the apply
          column, not the Nav/Footer — chrome stays live, form materializes
          beneath the lockup. */}
      <div className="relative min-h-[calc(100vh-120px)]">
        <AnimatePresence>
          {showIntro && (
            <PageIntroOverlay
              key="apply-intro"
              lottiePath="/lottie/check-intro.json"
              wordmark="VETTED"
              ariaLabel="Loading the vetting application"
              onDone={doneIntro}
            />
          )}
        </AnimatePresence>

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-text-muted mb-2">
              The vetting
            </p>
            <h1 className="text-[24px] md:text-[30px] font-semibold text-text-primary tracking-[-0.03em]">
              Apply to be vibechckd
            </h1>
            <p className="text-[14px] text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Every creator earns the seal. We weigh craft, taste, and what you actually ship — not follower counts.
            </p>
            <p className="text-[12px] text-text-muted mt-3 font-mono">
              Decisions inside 3–5 business days.
            </p>
          </motion.div>

          {/* Sign-in nudge for anonymous applicants — without an account we can't
              link the application to a user, so they can't track their status. */}
          {status !== "loading" && !isSignedIn && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 border border-border rounded-[10px] p-4 hover:border-border-hover transition-colors"
            >
              <p className="text-[13px] text-text-primary font-medium mb-1">
                Want to follow your application?
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed mb-3">
                Make a creator account first — you&apos;ll see status updates here and we&apos;ll ping you the moment you&apos;re in.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/register?role=coder"
                  className="inline-flex items-center h-9 md:h-8 px-3 rounded-md bg-[#171717] text-[#fafafa] text-[12px] font-medium hover:bg-[#0a0a0a] transition-colors min-w-[44px]"
                >
                  Create account
                </Link>
                <Link
                  href="/login?next=/apply"
                  className="inline-flex items-center h-9 md:h-8 px-3 rounded-md border border-border text-[12px] text-text-secondary hover:border-border-hover hover:bg-surface-muted transition-colors min-w-[44px]"
                >
                  Sign in
                </Link>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <ApplicationForm
              initialName={session?.user?.name || ""}
              initialEmail={session?.user?.email || ""}
            />
          </motion.div>

          {isSignedIn && (
            <p className="text-[12px] text-text-muted text-center mt-8">
              Already applied?{" "}
              <Link
                href="/dashboard/application"
                className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
              >
                See where you stand
              </Link>
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
