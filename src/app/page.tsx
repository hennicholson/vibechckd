"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Button from "@/components/Button";
import HeroVSL from "@/components/HeroVSL";
import Badge from "@/components/Badge";

const clientSteps = [
  {
    step: "01",
    title: "Browse vetted talent",
    description: "Every coder in our gallery has passed a rigorous vetting process. No guesswork. Filter by specialty, review live portfolio work, and see exactly what they build.",
    metric: "12+ vetted coders",
  },
  {
    step: "02",
    title: "Assemble your team",
    description: "Pick a frontend specialist, a backend engineer, and a security expert. Our team builder lets you assemble a complete project team in under 60 seconds.",
    metric: "< 60s to assemble",
  },
  {
    step: "03",
    title: "Ship with confidence",
    description: "Initiate your project, assign deliverables, track progress, and communicate — all in one place. Every coder is accountable. Every milestone is visible.",
    metric: "Full project lifecycle",
  },
];

const coderSteps = [
  {
    step: "01",
    title: "Submit your work",
    description: "Upload your best portfolio pieces — live sites, case studies, design systems. Show us what you build and how you think.",
  },
  {
    step: "02",
    title: "Get verified",
    description: "Our AI-assisted vetting reviews craft quality, code standards, and design taste. If you pass, you earn the badge.",
  },
  {
    step: "03",
    title: "Start getting hired",
    description: "Your profile goes live. Clients find you through the gallery. Project inquiries come directly to you. No bidding wars, no race to the bottom.",
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      {/* Hero */}
      <section>
        <div className="max-w-[960px] mx-auto px-6 pt-16 pb-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-[32px] font-semibold text-text-primary tracking-[-0.04em] leading-[1.15]">
              The most vetted vibe coders<br />in the game.
            </h1>
            <p className="text-[14px] text-text-secondary mt-4 max-w-[400px] leading-[1.55]">
              Every coder on vibechckd has been heavily vetted. Clients don&apos;t gamble on talent. The verified badge means something.
            </p>
            <div className="flex gap-2 mt-6">
              <Link href="/browse">
                <Button>Browse coders</Button>
              </Link>
              <Link href="/apply">
                <Button variant="secondary">Apply</Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <HeroVSL />
          </motion.div>
        </div>
      </section>

      {/* Stats row */}
      <section>
        <div className="max-w-[960px] mx-auto px-6 py-6">
          <p className="text-[12px] font-mono text-text-muted text-center tracking-[0.02em]">
            12 verified coders &middot; 30+ portfolio pieces &middot; 5 specialties
          </p>
        </div>
      </section>

      {/* For Clients */}
      <section className="py-20 border-t border-border mt-12">
        <div className="max-w-[960px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-2">For clients</p>
            <h2 className="text-[24px] font-semibold text-text-primary tracking-[-0.03em] leading-[1.2]">
              From browse to shipped<br />in record time.
            </h2>
            <p className="text-[14px] text-text-muted mt-3 max-w-[480px] leading-[1.55]">
              Stop scrolling through unvetted freelancers. Every developer on vibechckd has been verified for craft, speed, and reliability.
            </p>
          </motion.div>

          <div className="mt-12 space-y-0">
            {clientSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-6 py-8 border-b border-border group"
              >
                {/* Step number */}
                <div className="w-8 flex-shrink-0">
                  <span className="text-[11px] font-mono text-border-hover">{step.step}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-text-primary tracking-[-0.01em]">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-text-muted mt-2 leading-[1.6] max-w-[500px]">
                    {step.description}
                  </p>
                </div>

                {/* Metric */}
                <div className="hidden sm:flex items-start flex-shrink-0">
                  <span className="text-[11px] font-mono text-text-muted bg-surface-muted px-2.5 py-1 rounded-md">
                    {step.metric}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/browse">
              <Button>Browse the gallery</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* For Coders */}
      <section className="py-20 border-t border-border bg-background-alt">
        <div className="max-w-[960px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-2">For coders</p>
            <h2 className="text-[24px] font-semibold text-text-primary tracking-[-0.03em] leading-[1.2]">
              The badge that opens doors.
            </h2>
            <p className="text-[14px] text-text-muted mt-3 max-w-[480px] leading-[1.55]">
              Get verified. Get found. Get hired by clients who value quality over price. No bidding. No competing on cost.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {coderSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="border border-border rounded-[10px] p-5 bg-background hover:border-border-hover hover:-translate-y-px transition-all duration-200"
              >
                <div className="mb-3">
                  <span className="text-[11px] font-mono text-border-hover">{step.step}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em] inline-flex items-center gap-1.5">
                  {step.title}
                  {i === 1 && <Badge variant="verified" size="md" />}
                </h3>
                <p className="text-[13px] text-text-muted mt-2 leading-[1.55]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/apply">
              <Button>Apply to join</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-[960px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-[24px] font-semibold text-text-primary tracking-[-0.03em] leading-[1.2]">
              Ready to work with the best?
            </h2>
            <p className="text-[14px] text-text-muted mt-3 max-w-[400px] mx-auto leading-[1.55]">
              Whether you are hiring or building your reputation, vibechckd is where quality meets opportunity.
            </p>
            <div className="flex gap-2 mt-6 justify-center">
              <Link href="/browse">
                <Button>Browse coders</Button>
              </Link>
              <Link href="/apply">
                <Button variant="secondary">Apply to join</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageShell>
  );
}
