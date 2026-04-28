"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROJECT_TYPES = ["Website", "Web app", "Mobile app", "Design system", "E-commerce", "Other"];
const BUDGETS = ["< $5k", "$5k - $15k", "$15k - $50k", "$50k+"];

interface Props {
  defaultName: string | null;
}

export default function ClientOnboardingForm({ defaultName }: Props) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(skip: boolean) {
    setError(null);
    setSubmitting(true);
    const body = skip
      ? { skip: true }
      : { companyName, projectType, budget, description };
    const res = await fetch("/api/whop/onboarding/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Something went wrong, try again.");
      return;
    }
    router.push("/whop");
    router.refresh();
  }

  const firstName = defaultName ? defaultName.split(" ")[0] : null;

  return (
    <main className="min-h-screen flex items-start justify-center bg-background-alt px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Client onboarding
          </p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em] mb-2">
            {firstName ? `Tell us about your project, ${firstName}` : "Tell us about your project"}
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            This helps us match you with the right coders. You can skip and fill it in later.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
          className="space-y-5 border border-border rounded-[10px] p-5 bg-background"
        >
          <Field label="Company / Brand name">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
            />
          </Field>

          <Field label="What are you building?">
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((t) => (
                <Pill
                  key={t}
                  selected={projectType === t}
                  onClick={() => setProjectType(t)}
                  label={t}
                />
              ))}
            </div>
          </Field>

          <Field label="Budget range">
            <div className="grid grid-cols-2 gap-2">
              {BUDGETS.map((b) => (
                <Pill
                  key={b}
                  selected={budget === b}
                  onClick={() => setBudget(b)}
                  label={b}
                />
              ))}
            </div>
          </Field>

          <Field label="Project description" hint="Optional — what you're building, the problems you're solving.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary resize-none"
            />
            <p className="text-[10px] text-text-muted text-right mt-1">{description.length}/500</p>
          </Field>

          {error && <p className="text-[12px] text-negative font-mono">{error}</p>}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Saving…" : "Continue to marketplace"}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="w-full text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer text-center disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </form>

        <p className="text-[11px] text-text-muted text-center mt-5 leading-relaxed">
          You&apos;re signed in via Whop. Add a password later from Settings if
          you want to also sign in directly at vibechckd.cc.
        </p>
      </div>
    </main>
  );
}

function Pill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-[12px] rounded-lg border transition-colors cursor-pointer ${
        selected
          ? "bg-text-primary text-white border-text-primary"
          : "border-border text-text-secondary hover:border-border-hover"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
