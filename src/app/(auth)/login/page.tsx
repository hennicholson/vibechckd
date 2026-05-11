"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useToast, failed } from "@/components/Toast";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const verifiedSuccess = searchParams.get("verified") === "1";
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "Didn't get verification email?" inline panel state.
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password — both, please.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("That email and password don't match.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast(failed("sign you in"), "error");
      setError("Something broke on our end. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const target = (resendEmail || email).trim().toLowerCase();
    if (!target || resendLoading) return;
    setResendLoading(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      setResendDone(true);
    } catch {
      // Endpoint is enumeration-safe and responds success even on internal
      // error — UI can safely report "email sent" without leaking.
      setResendDone(true);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Sign in
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Pick up where you left off.
      </p>

      {resetSuccess && (
        <p className="text-[12px] text-positive bg-positive/10 border border-positive/20 rounded-lg px-3 py-2 mb-4 text-center">
          New password is live. Sign in to keep going.
        </p>
      )}

      {verifiedSuccess && (
        <p className="text-[12px] text-positive bg-positive/10 border border-positive/20 rounded-lg px-3 py-2 mb-4 text-center">
          Email verified — sign in to wrap up.
        </p>
      )}

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
        />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-negative" role="alert" aria-live="polite">{error}</p>
        )}

        <Button type="submit" size="lg" className="w-full min-h-[44px] md:min-h-0" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Resend verification — anyone can click (endpoint is enumeration-safe). */}
      <div className="mt-4 text-center">
        {!showResend ? (
          <button
            type="button"
            onClick={() => {
              setShowResend(true);
              setResendEmail(email);
              setResendDone(false);
            }}
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Verification email never showed up? Resend it
          </button>
        ) : (
          <form onSubmit={handleResend} className="space-y-2 text-left">
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 min-h-[44px] md:min-h-0" disabled={resendLoading || resendDone || !resendEmail}>
                {resendLoading ? "Sending…" : resendDone ? "Sent" : "Resend link"}
              </Button>
              <button
                type="button"
                onClick={() => setShowResend(false)}
                className="text-[12px] text-text-muted hover:text-text-primary transition-colors px-3 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            {resendDone && (
              <p className="text-[11px] text-text-muted text-center">
                If an unverified account uses that email, a fresh link is on its way.
              </p>
            )}
          </form>
        )}
      </div>

      <p className="text-[13px] text-text-muted text-center mt-5">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>

      <p className="text-[11px] text-text-muted text-center mt-3">
        New here?{" "}
        <Link href="/register?role=client" className="text-text-secondary hover:text-text-primary transition-colors">
          I&apos;m hiring
        </Link>
        {" "}&middot;{" "}
        <Link href="/register?role=coder" className="text-text-secondary hover:text-text-primary transition-colors">
          I&apos;m a creator
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
