"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";

type Role = "coder" | "client";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as Role) || null;

  const [role, setRole] = useState<Role | null>(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Try logging in.");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  // Step 1: Choose role
  if (!role) {
    return (
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Join vibechckd
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          How will you use the platform?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setRole("client")}
            className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-text-primary">I&apos;m hiring</p>
                  <p className="text-[12px] text-text-muted mt-0.5">Browse vetted coders, build teams, ship projects</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => setRole("coder")}
            className="w-full text-left border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-all duration-150 hover:-translate-y-[1px] cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-text-primary">I&apos;m a coder</p>
                  <p className="text-[12px] text-text-muted mt-0.5">Get verified, showcase your portfolio, get hired</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <p className="text-[13px] text-text-muted text-center mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Create account
  return (
    <div>
      <button
        onClick={() => setRole(null)}
        className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer mb-4"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        {role === "client" ? "Create client account" : "Create coder account"}
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-1.5">
        {role === "client"
          ? "Start hiring vetted vibe coders"
          : "Apply to join the verified coder marketplace"}
      </p>
      <p className="text-[11px] text-text-muted text-center mb-6">
        {role === "client"
          ? "Start browsing vetted talent immediately after signup"
          : "You\u2019ll complete your vetting application after creating your account"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={role === "client" ? "Company or your name" : "Full name"}
          placeholder={role === "client" ? "Acme Inc. or John Doe" : "Your full name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-[12px] text-negative">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
