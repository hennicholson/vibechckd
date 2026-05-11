"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useToast, failed } from "@/components/Toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("We need your email to send the link.");
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
        setError(data.error || "We hit a snag sending that.");
        toast(failed("send the reset link"), "error");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Connection hiccup. Try again.");
      toast(failed("send the reset link"), "error");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex justify-center mb-4">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-text-primary/15"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>
        </div>

        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Check your inbox
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6 leading-relaxed">
          If that email matches an account, a reset link is on the way.
        </p>

        <p className="text-[13px] text-text-muted text-center">
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Reset your password
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Drop your email — we&apos;ll send a fresh link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />

        {error && (
          <p className="text-[12px] text-negative" role="alert" aria-live="polite">{error}</p>
        )}

        <Button type="submit" className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={loading || !email}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        Remembered it?{" "}
        <Link href="/login" className="text-text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
