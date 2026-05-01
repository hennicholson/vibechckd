"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import PageShell from "@/components/PageShell";
import Button from "@/components/Button";
import VerifiedSeal from "@/components/VerifiedSeal";

/* ──────────────────────────────────────────────────────────────────────────
   /learnmore — interactive walkthrough of the platform.

   Built as a horizontal slide deck. Each slide pairs short copy with a
   purpose-built animated visual so the page can act as a self-running pitch
   when the founder is showing the product to someone in person. Navigation:
   prev/next buttons, ← / → / Space keys, swipe on touch, clickable dots.
   ────────────────────────────────────────────────────────────────────────── */

type Slide = {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  visual: React.ReactNode;
};

/* ── Visual: animated verified seal that "stamps" in ────────────────────── */
function StampVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ scale: 2.2, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.15 }}
        className="relative"
      >
        <VerifiedSeal size="lg" className="!w-[140px] !h-[140px]" />
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-text-primary/20"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 1.2, delay: 0.6, repeat: Infinity, repeatDelay: 1.4 }}
        />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-6 text-[11px] font-mono text-text-muted uppercase tracking-[0.12em]"
      >
        Verified · Earned · Real
      </motion.p>
    </div>
  );
}

/* ── Visual: "the problem" — three pain-point cards stacking up ─────────── */
function ProblemVisual() {
  const items = [
    { label: "Random freelancer marketplaces", note: "race to the bottom" },
    { label: "Endless DMs in Discord", note: "no accountability" },
    { label: '"Trust me, I built this" portfolios', note: "no verification" },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 px-2">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.4 }}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.25 + i * 0.12, type: "spring", stiffness: 300 }}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-negative/10 text-negative flex items-center justify-center text-[14px] font-medium"
          >
            ✕
          </motion.span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-text-primary font-medium truncate">{it.label}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{it.note}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Visual: animated "Browse" gallery grid ─────────────────────────────── */
function GalleryVisual() {
  const cells = Array.from({ length: 6 });
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {cells.map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.05 + i * 0.07, duration: 0.4 }}
            className="aspect-square rounded-lg border border-border bg-background relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-surface-muted to-background" />
            <div className="absolute top-1.5 right-1.5">
              <VerifiedSeal size="xs" />
            </div>
            <motion.div
              className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-full bg-text-primary/10 overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${30 + ((i * 17) % 60)}%` }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.6 }}
                className="h-full bg-text-primary/40"
              />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Visual: team-builder slots populating one by one ───────────────────── */
function TeamVisual() {
  const roles = [
    { role: "Frontend", initials: "JS" },
    { role: "Backend", initials: "MK" },
    { role: "Security", initials: "AL" },
  ];
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col gap-2.5 w-full max-w-[300px]">
        {roles.map((r, i) => (
          <motion.div
            key={r.role}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.25, duration: 0.4 }}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.35 + i * 0.25, type: "spring", stiffness: 280 }}
              className="w-9 h-9 rounded-full bg-text-primary text-background flex items-center justify-center text-[12px] font-semibold"
            >
              {r.initials}
            </motion.div>
            <div className="flex-1">
              <p className="text-[12px] font-mono text-text-muted uppercase tracking-[0.06em]">
                Slot 0{i + 1}
              </p>
              <p className="text-[13px] text-text-primary font-medium inline-flex items-center gap-1">
                {r.role}
                <VerifiedSeal size="xs" />
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.25 }}
              className="text-[11px] font-mono text-positive"
            >
              ✓
            </motion.div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-center text-[11px] font-mono text-text-muted mt-1"
        >
          Team assembled in &lt; 60s
        </motion.div>
      </div>
    </div>
  );
}

/* ── Visual: animated project lifecycle bar w/ checkpoints ──────────────── */
function ShipVisual() {
  const stages = ["Brief", "Build", "Review", "Ship"];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[320px] relative">
        <div className="absolute top-3 left-3 right-3 h-px bg-border" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "calc(100% - 24px)" }}
          transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
          className="absolute top-3 left-3 h-px bg-text-primary"
        />
        <div className="relative flex justify-between">
          {stages.map((s, i) => (
            <motion.div
              key={s}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.4, type: "spring", stiffness: 280 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-text-primary text-background flex items-center justify-center text-[10px] font-semibold">
                {i + 1}
              </div>
              <span className="text-[11px] font-mono text-text-muted uppercase tracking-[0.06em]">
                {s}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="text-[12px] text-text-muted mt-8 text-center max-w-[300px]"
      >
        Track every milestone. Message in-thread. No lost context.
      </motion.p>
    </div>
  );
}

/* ── Visual: animated application form filling itself in ────────────────── */
function ApplyVisual() {
  const fields = [
    { label: "Portfolio link", value: "joycoded.dev" },
    { label: "Specialty", value: "Frontend / motion" },
    { label: "Best work", value: "3 case studies" },
  ];
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[300px] flex flex-col gap-3">
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.18, duration: 0.35 }}
            className="border border-border rounded-lg bg-background"
          >
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-[0.06em] px-3 pt-2">
              {f.label}
            </p>
            <div className="px-3 pb-2 text-[13px] text-text-primary font-medium overflow-hidden">
              <TypingText text={f.value} delay={0.35 + i * 0.18} />
            </div>
          </motion.div>
        ))}
        <motion.button
          disabled
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-1 px-4 py-2 rounded-lg bg-text-primary text-background text-[12px] font-medium"
        >
          Submit application
        </motion.button>
      </div>
    </div>
  );
}

/* Tiny helper: "typewriter" effect for ApplyVisual */
function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const displayed = useTransform(rounded, (v) => text.slice(0, v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, text.length, {
      duration: text.length * 0.045,
      delay,
      ease: "linear",
    });
    return () => controls.stop();
  }, [count, text, delay]);

  useEffect(() => {
    return displayed.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [displayed]);

  return <span ref={ref}>&nbsp;</span>;
}

/* ── Visual: vetting checklist resolving to a "passed" state ────────────── */
function VetVisual() {
  const checks = [
    "Craft & visual taste",
    "Code quality & patterns",
    "Live, working portfolio",
    "Communication & follow-through",
  ];
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[300px] flex flex-col gap-2.5">
        {checks.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.18 }}
            className="flex items-center gap-3"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.18, type: "spring", stiffness: 320 }}
              className="w-5 h-5 rounded-full bg-positive/10 text-positive flex items-center justify-center text-[11px] font-semibold"
            >
              ✓
            </motion.span>
            <span className="text-[13px] text-text-primary">{c}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 280 }}
          className="mt-2 inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-md bg-surface-muted"
        >
          <VerifiedSeal size="xs" />
          <span className="text-[11px] font-mono text-text-primary">Badge issued</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Visual: incoming inbox messages ───────────────────────────────────── */
function HiredVisual() {
  const msgs = [
    { from: "Acme Inc.", text: "Need a landing page in 10 days." },
    { from: "Fern Studio", text: "Loved your case studies — chat?" },
    { from: "Ravi K.", text: "Slot for next month?" },
  ];
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[300px] flex flex-col gap-2">
        {msgs.map((m, i) => (
          <motion.div
            key={m.from}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.28, duration: 0.35 }}
            className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-background"
          >
            <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-medium text-text-muted">
              {m.from.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-text-primary truncate">{m.from}</p>
              <p className="text-[11px] text-text-muted truncate">{m.text}</p>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.45 + i * 0.28, type: "spring", stiffness: 320 }}
              className="w-1.5 h-1.5 rounded-full bg-positive mt-2"
            />
          </motion.div>
        ))}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-[11px] font-mono text-text-muted text-center mt-1"
        >
          3 new project inquiries
        </motion.p>
      </div>
    </div>
  );
}

/* ── Visual: cover ─ animated wordmark + seal ───────────────────────────── */
function CoverVisual() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 select-none">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="relative"
      >
        <VerifiedSeal size="lg" className="!w-[100px] !h-[100px]" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="font-body font-semibold text-[28px] tracking-[-0.04em] text-text-primary inline-flex items-center gap-1"
      >
        vibechckd
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-[11px] font-mono text-text-muted uppercase tracking-[0.18em]"
      >
        a 2-minute walkthrough
      </motion.p>
    </div>
  );
}

/* ── Visual: closing CTA ────────────────────────────────────────────────── */
function ClosingVisual() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="text-[64px]"
        >
          <VerifiedSeal size="lg" className="!w-[88px] !h-[88px]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <Button href="/browse">Browse coders</Button>
          <Button href="/apply" variant="secondary">Apply to join</Button>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-[11px] font-mono text-text-muted uppercase tracking-[0.12em]"
        >
          Quality over price · Always
        </motion.p>
      </div>
    </div>
  );
}

/* ── Slide content ──────────────────────────────────────────────────────── */
const slides: Slide[] = [
  {
    id: "cover",
    eyebrow: "00 — Intro",
    title: <>The most vetted vibe coders in the game.</>,
    body: (
      <>Take 2 minutes. We&apos;ll walk through what vibechckd is, who it&apos;s for, and why the badge actually means something.</>
    ),
    visual: <CoverVisual />,
  },
  {
    id: "problem",
    eyebrow: "01 — The problem",
    title: <>Hiring developers is broken.</>,
    body: (
      <>Marketplaces optimize for cheapest bid. Discord servers are a black box. Portfolios lie. Clients gamble — and usually lose.</>
    ),
    visual: <ProblemVisual />,
  },
  {
    id: "solution",
    eyebrow: "02 — The solution",
    title: <>A gallery of vetted builders. Nothing else.</>,
    body: (
      <>vibechckd is a small, curated roster of developers who&apos;ve been verified for craft, speed, and reliability. If they&apos;re in the gallery, they&apos;re real.</>
    ),
    visual: <StampVisual />,
  },
  {
    id: "badge",
    eyebrow: "03 — The badge",
    title: <>What the verified badge actually means.</>,
    body: (
      <>Every applicant goes through a structured review. Code quality, design taste, live work, communication. No badge is handed out lightly.</>
    ),
    visual: <VetVisual />,
  },
  {
    id: "browse",
    eyebrow: "04 — For clients · Step 1",
    title: <>Browse the gallery.</>,
    body: (
      <>Filter by specialty. See live portfolio pieces. Every card you look at is someone who&apos;s already passed our review.</>
    ),
    visual: <GalleryVisual />,
  },
  {
    id: "team",
    eyebrow: "05 — For clients · Step 2",
    title: <>Assemble a team in under a minute.</>,
    body: (
      <>Pick a frontend specialist, a backend engineer, a security expert. Drop them into team slots and you&apos;ve got a complete project crew.</>
    ),
    visual: <TeamVisual />,
  },
  {
    id: "ship",
    eyebrow: "06 — For clients · Step 3",
    title: <>Ship with full visibility.</>,
    body: (
      <>Brief, build, review, ship. Milestones are tracked. Conversations stay in-thread. Nothing falls through the cracks.</>
    ),
    visual: <ShipVisual />,
  },
  {
    id: "apply",
    eyebrow: "07 — For coders · Step 1",
    title: <>Submit your best work.</>,
    body: (
      <>Drop your portfolio link, pick a specialty, and tell us what you build. The application is short — your work has to do the talking.</>
    ),
    visual: <ApplyVisual />,
  },
  {
    id: "verify",
    eyebrow: "08 — For coders · Step 2",
    title: <>Earn the badge.</>,
    body: (
      <>If your craft is real, you&apos;re in. The verified seal is yours to display — on your profile, in your bio, anywhere your work lives.</>
    ),
    visual: <StampVisual />,
  },
  {
    id: "hired",
    eyebrow: "09 — For coders · Step 3",
    title: <>Get hired without bidding wars.</>,
    body: (
      <>Clients find you through the gallery. Inquiries come straight to your inbox. No competing on price. No race to the bottom.</>
    ),
    visual: <HiredVisual />,
  },
  {
    id: "cta",
    eyebrow: "10 — Your turn",
    title: <>Ready to take a look?</>,
    body: (
      <>Browse the gallery to see the vetted coders, or apply if you want to join them.</>
    ),
    visual: <ClosingVisual />,
  },
];

/* ──────────────────────────────────────────────────────────────────────── */

export default function LearnMorePage() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const total = slides.length;
  const isLast = index === total - 1;
  const isFirst = index === 0;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index, total]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(total - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, total]);

  const slide = slides[index];
  const progress = ((index + 1) / total) * 100;

  return (
    <PageShell>
      <div className="max-w-[960px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-10 md:pb-16">
        {/* Header strip — progress + counter */}
        <div className="flex items-center gap-4">
          <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.1em] flex-shrink-0">
            Walkthrough
          </p>
          <div className="flex-1 h-[3px] rounded-full bg-surface-muted overflow-hidden">
            <motion.div
              className="h-full bg-text-primary"
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
          <p className="text-[11px] font-mono text-text-muted tabular-nums flex-shrink-0">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
        </div>

        {/* Slide stage */}
        <div className="mt-4 md:mt-6 relative rounded-2xl border border-border bg-background-alt overflow-hidden">
          <div className="relative h-[560px] md:h-[520px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide.id}
                custom={direction}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -300) next();
                  else if (info.offset.x > 60 || info.velocity.x > 300) prev();
                }}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0 grid grid-cols-1 md:grid-cols-[1fr_1.05fr] cursor-grab active:cursor-grabbing"
              >
                {/* Copy */}
                <div className="px-6 md:px-10 pt-7 md:pt-12 pb-2 md:pb-12 flex flex-col justify-center">
                  <motion.p
                    key={`${slide.id}-eyebrow`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="text-[11px] font-mono text-text-muted uppercase tracking-[0.12em]"
                  >
                    {slide.eyebrow}
                  </motion.p>
                  <motion.h2
                    key={`${slide.id}-title`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="mt-3 text-[24px] md:text-[34px] font-semibold text-text-primary tracking-[-0.035em] leading-[1.1]"
                  >
                    {slide.title}
                  </motion.h2>
                  <motion.p
                    key={`${slide.id}-body`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 text-[14px] md:text-[15px] text-text-secondary leading-[1.6] max-w-[440px]"
                  >
                    {slide.body}
                  </motion.p>

                  {/* Inline CTAs only on last slide (mobile-only — visual has them on desktop) */}
                  {isLast && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="md:hidden mt-5 flex gap-2"
                    >
                      <Button href="/browse">Browse coders</Button>
                      <Button href="/apply" variant="secondary">Apply</Button>
                    </motion.div>
                  )}
                </div>

                {/* Visual */}
                <div className="relative min-h-[260px] md:min-h-0 border-t md:border-t-0 md:border-l border-border bg-background">
                  <div className="absolute inset-0 px-6 py-6 md:px-8 md:py-10">
                    {slide.visual}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Side arrows — desktop */}
          <button
            onClick={prev}
            disabled={isFirst}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background border border-border items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            disabled={isLast}
            aria-label="Next slide"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background border border-border items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer controls — dots + mobile prev/next */}
        <div className="mt-4 md:mt-5 flex items-center justify-between gap-4">
          <button
            onClick={prev}
            disabled={isFirst}
            className="md:hidden text-[12px] font-mono text-text-muted uppercase tracking-[0.06em] disabled:opacity-30 cursor-pointer"
          >
            ← Prev
          </button>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="group p-1 cursor-pointer"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-200 ${
                      i === index
                        ? "w-6 bg-text-primary"
                        : "w-1.5 bg-border-hover group-hover:bg-text-muted"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={next}
            disabled={isLast}
            className="md:hidden text-[12px] font-mono text-text-muted uppercase tracking-[0.06em] disabled:opacity-30 cursor-pointer"
          >
            Next →
          </button>
        </div>

        {/* Hint row — keyboard / swipe */}
        <div className="mt-4 md:mt-6 flex items-center justify-center gap-3 text-[11px] font-mono text-text-muted">
          <span className="hidden md:inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-text-muted text-[10px]">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-text-muted text-[10px]">→</kbd>
            to navigate
          </span>
          <span className="md:hidden">Swipe to navigate</span>
          <span className="text-border-hover">·</span>
          <span>Press any dot to jump</span>
        </div>
      </div>
    </PageShell>
  );
}
