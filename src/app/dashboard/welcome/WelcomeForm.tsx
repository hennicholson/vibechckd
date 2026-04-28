"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "client" | "coder";

interface Props {
  defaultEmail: string;
  defaultName: string;
  next: string;
  cameFromWhop: boolean;
}

export default function WelcomeForm({ defaultEmail, defaultName, next, cameFromWhop }: Props) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) {
      setError("Pick how you'll use vibechckd.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Something went wrong, try again.");
      return;
    }
    // Creators go straight into the existing vetting form. Clients land on
    // wherever they were trying to go (defaults to /dashboard).
    const dest = role === "coder" ? "/apply" : next;
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="min-h-full flex items-start justify-center bg-background-alt px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2">
            Welcome
          </p>
          <h1 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em] mb-2">
            {defaultName ? `Welcome, ${defaultName.split(" ")[0]}` : "Welcome to vibechckd"}
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {cameFromWhop
              ? "We pulled your Whop account in — finish setup so you can also sign in directly outside of Whop."
              : "Set up your account to get started."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <section>
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-2.5">
              How will you use vibechckd?
            </p>
            <div className="space-y-2.5">
              <RoleCard
                selected={role === "client"}
                onClick={() => setRole("client")}
                title="I'm hiring coders"
                description="Browse vetted talent, build teams, ship projects"
                icon={
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                }
              />
              <RoleCard
                selected={role === "coder"}
                onClick={() => setRole("coder")}
                title="I'm a creator"
                description="Get verified, showcase your portfolio, get hired"
                icon={
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                }
              />
            </div>
          </section>

          <section className="space-y-4 border border-border rounded-[10px] p-5 bg-background">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password" hint="At least 8 characters.">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm password">
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
                autoComplete="new-password"
              />
            </Field>
          </section>

          {error && <p className="text-[12px] text-negative font-mono">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !role}
            className="w-full h-10 rounded-md bg-text-primary text-white text-[13px] font-medium disabled:opacity-60 cursor-pointer"
          >
            {submitting
              ? "Saving…"
              : role === "coder"
                ? "Continue to creator application"
                : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}

function RoleCard({
  selected,
  onClick,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full text-left rounded-[10px] p-4 transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group border ${
        selected
          ? "border-text-primary bg-surface-muted"
          : "border-border hover:border-border-hover hover:bg-surface-muted"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {icon}
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">{title}</p>
            <p className="text-[12px] text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
        <span
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? "border-text-primary bg-text-primary" : "border-border"
          }`}
        >
          {selected && (
            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      </div>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-text-muted mt-1">{hint}</span>}
    </label>
  );
}
