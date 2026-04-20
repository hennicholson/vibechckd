"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Check your email
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          If an account exists with that email, we&apos;ve sent a reset link.
        </p>

        <p className="text-[13px] text-text-muted text-center mt-5">
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Reset your password
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && (
          <p className="text-[12px] text-negative">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        Remember your password?{" "}
        <Link href="/login" className="text-text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
