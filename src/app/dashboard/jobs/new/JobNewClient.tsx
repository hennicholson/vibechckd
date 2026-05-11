"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { sectionVariants } from "@/lib/motion";
import { useToast, failed } from "@/components/Toast";

const PROJECT_TYPES = ["Website", "Web app", "Mobile app", "Design system", "E-commerce", "Other"];
const BUDGETS = ["< $5k", "$5k - $15k", "$15k - $50k", "$50k+"];
const TIMELINES = ["< 2 weeks", "1 month", "2-3 months", "Ongoing"];

export default function JobNewClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation lives client-side so the disabled state on the submit
  // button is honest: nothing posts until the title's real.
  const titleTrim = title.trim();
  const canSubmit = titleTrim.length >= 3 && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (titleTrim.length < 3) {
      setError("Title needs at least 3 characters.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: titleTrim,
        description: description.trim() || undefined,
        projectType: projectType || undefined,
        budgetRange: budget || undefined,
        timeline: timeline || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || failed("post your brief");
      setError(msg);
      toast(msg, "error");
      setSubmitting(false);
      return;
    }
    const data = (await res.json()) as { id: string };
    toast("Brief posted — creators will see it now", "success");
    router.push(`/dashboard/jobs/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <Link
          href="/dashboard/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-2 min-h-[24px]"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All jobs
        </Link>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
          Post a brief
        </h1>
        <p className="text-[11px] font-mono text-text-muted mt-0.5">
          Vetted creators only
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-12 pt-3">
        <p className="text-[13px] text-text-secondary mb-6 max-w-[560px] leading-relaxed">
          Tell us what you&apos;re building. We&apos;ll route it to creators
          whose work matches — they apply with one tap, you decide who&apos;s
          a fit.
        </p>

        <motion.form
          onSubmit={submit}
          initial="hidden"
          animate="show"
          variants={sectionVariants}
          className="space-y-5 border border-border rounded-[10px] p-5 bg-background"
        >
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 160))}
              placeholder="e.g. Landing page + dashboard for new SaaS"
              className="w-full min-h-[44px] px-3 rounded-md border border-border bg-background text-[16px] md:text-[14px] text-text-primary outline-none focus:border-text-primary"
            />
            <p className="text-[10px] font-mono text-text-muted text-right mt-1 tabular-nums">
              {title.length}/160
            </p>
          </Field>

          <Field
            label="What you're building"
            hint="Scope, stack, problems to solve. The clearer the brief, the better the matches."
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
              rows={5}
              placeholder="A two-page site for a new B2B product. Need it in Next.js, deploys to Vercel, integrates Stripe…"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[16px] md:text-[14px] text-text-primary outline-none focus:border-text-primary resize-none"
            />
            <p className="text-[10px] font-mono text-text-muted text-right mt-1 tabular-nums">
              {description.length}/5000
            </p>
          </Field>

          <Field label="Project type">
            <Pills options={PROJECT_TYPES} value={projectType} onSelect={setProjectType} />
          </Field>

          <Field label="Budget" hint="Creators self-select — pick the band you'd green-light.">
            <Pills options={BUDGETS} value={budget} onSelect={setBudget} />
          </Field>

          <Field label="Timeline">
            <Pills options={TIMELINES} value={timeline} onSelect={setTimeline} />
          </Field>

          {error && (
            <p className="text-[12px] text-negative font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full min-h-[44px] rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? "Posting your brief…" : "Post brief"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}

function Pills({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(value === o ? "" : o)}
          className={`px-3 min-h-[44px] text-[13px] rounded-lg border transition-colors cursor-pointer ${
            value === o
              ? "bg-text-primary text-white border-text-primary"
              : "border-border text-text-secondary hover:border-border-hover"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
        {label}
        {required && <span className="text-negative ml-0.5">*</span>}
      </p>
      {children}
      {hint && <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}
