"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SPECIALTIES = ["Frontend", "Backend", "Full Stack", "Security", "Automation"];
const EXPERIENCE = ["1-3 years", "3-7 years", "7+ years"];

interface Props {
  defaultName: string | null;
}

export default function CreatorOnboardingForm({ defaultName }: Props) {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [experience, setExperience] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function submit() {
    setError(null);
    if (specialties.length === 0) {
      setError("Pick at least one specialty.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/whop/onboarding/creator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialties: specialties.map((s) => s.toLowerCase().replace(" ", "-")),
        portfolioUrl: portfolioUrl || null,
        experience: experience || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Something went wrong, try again.");
      return;
    }
    // Continue to the full vetting flow at /apply.
    router.push("/apply");
    router.refresh();
  }

  const firstName = defaultName ? defaultName.split(" ")[0] : null;

  return (
    <main className="min-h-screen flex items-start justify-center bg-background-alt px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Creator onboarding
          </p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em] mb-2">
            {firstName ? `Tell us about your work, ${firstName}` : "Tell us about your work"}
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Quick intro — you&apos;ll complete the full vetting application next with portfolio uploads and work samples.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5 border border-border rounded-[10px] p-5 bg-background"
        >
          <Field label="Specialties" hint="Pick all that apply.">
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <Pill
                  key={s}
                  selected={specialties.includes(s)}
                  onClick={() => toggleSpecialty(s)}
                  label={s}
                />
              ))}
            </div>
          </Field>

          <Field label="Portfolio or website URL">
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
            />
          </Field>

          <Field label="Experience level">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXPERIENCE.map((e) => (
                <Pill
                  key={e}
                  selected={experience === e}
                  onClick={() => setExperience(e)}
                  label={e}
                />
              ))}
            </div>
          </Field>

          {error && <p className="text-[12px] text-negative font-mono">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Saving…" : "Continue to application"}
          </button>
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
      className={`px-3 py-1.5 text-[12px] rounded-lg border transition-colors cursor-pointer ${
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
