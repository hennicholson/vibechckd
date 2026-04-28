"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROJECT_TYPES = ["Website", "Web app", "Mobile app", "Design system", "E-commerce", "Other"];
const BUDGETS = ["< $5k", "$5k - $15k", "$15k - $50k", "$50k+"];
const TIMELINES = ["< 2 weeks", "1 month", "2-3 months", "Ongoing"];

export default function JobNewClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        projectType: projectType || undefined,
        budgetRange: budget || undefined,
        timeline: timeline || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Couldn't post job");
      setSubmitting(false);
      return;
    }
    const data = (await res.json()) as { id: string };
    router.push(`/dashboard/jobs/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <Link
          href="/dashboard/jobs"
          className="text-[11px] font-mono text-text-muted hover:text-text-primary inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All jobs
        </Link>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Post a job</h1>
        <p className="text-[12px] text-text-muted mt-0.5">
          Vetted creators will see this in their job board and can apply with one click.
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">
        <form onSubmit={submit} className="space-y-5 border border-border rounded-[10px] p-5 bg-background">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 160))}
              placeholder="e.g. Landing page + dashboard for new SaaS"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
            />
          </Field>

          <Field label="Description" hint="What you're building, scope, problems to solve. Optional.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
              rows={5}
              placeholder="Briefly describe the project…"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary resize-none"
            />
            <p className="text-[10px] text-text-muted text-right mt-1">{description.length}/5000</p>
          </Field>

          <Field label="Project type">
            <Pills options={PROJECT_TYPES} value={projectType} onSelect={setProjectType} />
          </Field>

          <Field label="Budget">
            <Pills options={BUDGETS} value={budget} onSelect={setBudget} />
          </Field>

          <Field label="Timeline">
            <Pills options={TIMELINES} value={timeline} onSelect={setTimeline} />
          </Field>

          {error && <p className="text-[12px] text-negative font-mono">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Posting…" : "Post job"}
          </button>
        </form>
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
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(value === o ? "" : o)}
          className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
        {label}
      </p>
      {children}
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}
