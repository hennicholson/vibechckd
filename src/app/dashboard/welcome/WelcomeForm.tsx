"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import VerifiedSeal from "@/components/VerifiedSeal";
import { useToast, failed } from "@/components/Toast";

type Role = "client" | "coder";

interface Props {
  defaultEmail: string;
  defaultName: string;
  next: string;
  cameFromWhop: boolean;
}

export default function WelcomeForm({ defaultEmail, defaultName, next, cameFromWhop }: Props) {
  const router = useRouter();
  const { toast } = useToast();
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
      setError("Passwords need at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two don't match yet.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      setSubmitting(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "We hit a snag setting that up.");
        toast(failed("finish setup"), "error");
        return;
      }
      // Creators go straight into the existing vetting form. Clients land on
      // wherever they were trying to go (defaults to /dashboard).
      const dest = role === "coder" ? "/apply" : next;
      router.push(dest);
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Connection hiccup. Try again.");
      toast(failed("finish setup"), "error");
    }
  }

  const firstName = defaultName?.split(" ")[0];

  return (
    <main className="min-h-full flex items-start md:items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* Brand lockup — mirrors the (auth) layout so /welcome reads as the
            same product, not a separate Whop onboarding island. */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-7"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-semibold text-text-primary">vibechckd</span>
            <VerifiedSeal size="sm" animate />
          </div>
          <span className="text-[11px] text-text-muted mt-1">The vetted coder marketplace</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="border border-border rounded-[10px] p-6 hover:border-border-hover transition-colors"
        >
          <div className="mb-6">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
              {firstName ? `Welcome in, ${firstName}` : "Welcome in"}
            </h1>
            <p className="text-[13px] text-text-muted mt-1 leading-relaxed">
              {cameFromWhop
                ? "We grabbed your Whop details. Finish setup so you can also sign in directly."
                : "Two quick things and you're rolling."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <section>
              <p className="text-[13px] font-medium text-text-primary mb-2">
                How will you use vibechckd?
              </p>
              <div className="space-y-2">
                <RoleCard
                  selected={role === "client"}
                  onClick={() => setRole("client")}
                  title="I'm hiring"
                  description="Find vetted talent, build a team, ship the thing."
                  icon={
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  }
                />
                <RoleCard
                  selected={role === "coder"}
                  onClick={() => setRole("coder")}
                  title="I'm a creator"
                  description="Get vibechckd. Show the work. Get the work."
                  icon={
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  }
                />
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-5">
              <Field label="Email">
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-[16px] md:text-[13px] text-text-primary outline-none focus:border-text-secondary transition-colors"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" hint={password.length > 0 && password.length < 8 ? `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} to go.` : "At least 8 characters."}>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-[16px] md:text-[13px] text-text-primary outline-none focus:border-text-secondary transition-colors"
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
                  className={`w-full h-10 px-3 rounded-lg border bg-background text-[16px] md:text-[13px] text-text-primary outline-none focus:border-text-secondary transition-colors ${
                    confirm.length > 0 && confirm !== password ? "border-negative" : "border-border"
                  }`}
                  autoComplete="new-password"
                />
              </Field>
            </section>

            {error && <p className="text-[12px] text-negative" role="alert" aria-live="polite">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !role}
              className="w-full min-h-[44px] md:min-h-[40px] rounded-lg bg-[#171717] text-[#fafafa] text-[13px] font-medium hover:bg-[#0a0a0a] transition-colors disabled:bg-surface-muted disabled:text-text-muted disabled:pointer-events-none cursor-pointer"
            >
              {submitting
                ? "Saving…"
                : role === "coder"
                  ? "Continue to creator application"
                  : role === "client"
                    ? "Continue to dashboard"
                    : "Continue"}
            </button>
          </form>
        </motion.div>
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
      className={`w-full text-left rounded-[10px] p-3.5 transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group border min-h-[64px] ${
        selected
          ? "border-text-primary bg-surface-muted"
          : "border-border hover:border-border-hover hover:bg-surface-muted"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {icon}
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-text-primary">{title}</p>
            <p className="text-[12px] text-text-muted mt-0.5 leading-snug">{description}</p>
          </div>
        </div>
        <span
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? "border-text-primary bg-text-primary" : "border-border"
          }`}
          aria-hidden
        >
          {selected && (
            <svg className="w-2 h-2 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
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
      <span className="block text-[13px] font-medium text-text-primary mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-text-muted mt-1.5">{hint}</span>}
    </label>
  );
}
