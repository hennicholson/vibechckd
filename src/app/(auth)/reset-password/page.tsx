"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useToast, failed } from "@/components/Toast";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit = passwordLongEnough && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!passwordLongEnough) {
      setError("Passwords need at least 8 characters.");
      return;
    }

    if (!passwordsMatch) {
      setError("Those two don't match yet.");
      return;
    }

    if (!token || !email) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "We hit a snag resetting that.");
        toast(failed("reset your password"), "error");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("Connection hiccup. Try again.");
      toast(failed("reset your password"), "error");
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          This link is stale
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          Reset links expire fast for safety. Grab a fresh one.
        </p>
        <div className="space-y-3">
          <Button href="/forgot-password" className="w-full min-h-[44px] md:min-h-0" size="lg">Request a new link</Button>
          <p className="text-[13px] text-text-muted text-center">
            <Link href="/login" className="text-text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  const showMismatch = newPassword.length > 0 && confirmPassword.length > 0 && !passwordsMatch;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Set a new password
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Make it a good one — at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {newPassword.length > 0 && !passwordLongEnough && (
            <p className="text-[11px] text-text-muted mt-1.5">{8 - newPassword.length} more character{8 - newPassword.length === 1 ? "" : "s"} to go.</p>
          )}
          {passwordLongEnough && (
            <p className="text-[11px] text-positive mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Long enough
            </p>
          )}
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={showMismatch ? "Doesn't match yet" : undefined}
        />

        {error && (
          <p className="text-[12px] text-negative" role="alert" aria-live="polite">{error}</p>
        )}

        <Button type="submit" className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={!canSubmit}>
          {loading ? "Resetting…" : "Reset password"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        <Link href="/login" className="text-text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
