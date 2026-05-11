"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/Button";
import { CheckSuccess, ErrorX } from "@/components/lottie";

type Phase = "prompt" | "verifying" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  // If a token is present, we're completing verification. Otherwise we're
  // showing the "check your inbox" landing after registration.
  const hasToken = Boolean(tokenParam && emailParam);

  const [phase, setPhase] = useState<Phase>(hasToken ? "verifying" : "prompt");
  const [errorMessage, setErrorMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenParam, email: emailParam }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setErrorMessage(data.error || "That link didn't work for us.");
          setPhase("error");
          return;
        }

        setPhase("success");
        // Short pause so the user sees the confirmation state, then redirect.
        setTimeout(() => {
          if (!cancelled) router.push("/login?verified=1");
        }, 1400);
      } catch {
        if (cancelled) return;
        setErrorMessage("Connection hiccup. Try the link again.");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasToken, tokenParam, emailParam, router]);

  async function handleResend() {
    if (!emailParam || resending) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam.trim().toLowerCase() }),
      });
      // Endpoint always responds {success:true} — don't reveal whether
      // dispatch actually happened.
      setResent(true);
    } catch {
      // Silent — the API itself is enumeration-safe and idempotent; user can
      // retry.
    } finally {
      setResending(false);
    }
  }

  if (phase === "verifying") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-text-primary animate-spin" />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
          Verifying your email
        </h1>
        <p className="text-[13px] text-text-muted mt-1">
          Hang tight — a second or two.
        </p>
      </motion.div>
    );
  }

  if (phase === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <div className="flex justify-center mb-3">
          <CheckSuccess size={56} />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
          You&apos;re verified
        </h1>
        <p className="text-[13px] text-text-muted mt-1">
          Sending you to sign in…
        </p>
      </motion.div>
    );
  }

  if (phase === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex justify-center mb-3">
          <ErrorX size={48} />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          That link is stale
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          {errorMessage || "It might be expired or already used. Grab a fresh one."}
        </p>

        <div className="space-y-3">
          {emailParam && (
            <Button onClick={handleResend} className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={resending || resent}>
              {resending ? "Sending…" : resent ? "Fresh link on its way" : "Send a new link"}
            </Button>
          )}
          <p className="text-[13px] text-text-muted text-center">
            <Link href="/login" className="text-text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    );
  }

  // Default: "prompt" state — landing after registration.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Envelope icon — minimal, branded, sits where a Lottie would for
          parity with success/error states. Subtle ring matches card pattern. */}
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
        {emailParam ? (
          <>
            Verification link sent to{" "}
            <span className="text-text-primary font-medium break-all">{emailParam}</span>.
            Click it and you&apos;re in.
          </>
        ) : (
          <>A verification link is on its way. Click it and you&apos;re in.</>
        )}
      </p>

      <div className="space-y-3">
        {emailParam && (
          <Button onClick={handleResend} className="w-full min-h-[44px] md:min-h-0" size="lg" disabled={resending || resent}>
            {resending ? "Sending…" : resent ? "Sent another one" : "Resend email"}
          </Button>
        )}
        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Not in your inbox? Check spam, then resend above.
        </p>
        <p className="text-[13px] text-text-muted text-center mt-2">
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
