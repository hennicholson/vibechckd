"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/Button";

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
          setErrorMessage(data.error || "We couldn't verify that link.");
          setPhase("error");
          return;
        }

        setPhase("success");
        // Short pause so the user sees the confirmation state, then redirect.
        setTimeout(() => {
          if (!cancelled) router.push("/login?verified=1");
        }, 1200);
      } catch {
        if (cancelled) return;
        setErrorMessage("Something went wrong. Please try again.");
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
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Verifying your email
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          One moment...
        </p>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Email verified
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Verification failed
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          {errorMessage || "This link is invalid or expired."}
        </p>

        <div className="space-y-3">
          {emailParam && (
            <Button onClick={handleResend} className="w-full" disabled={resending || resent}>
              {resending ? "Sending..." : resent ? "Email sent" : "Send a new link"}
            </Button>
          )}
          <p className="text-[13px] text-text-muted text-center">
            <Link href="/login" className="text-text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Default: "prompt" state — landing after registration.
  return (
    <div>
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Check your email
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        {emailParam ? (
          <>
            We sent a verification link to{" "}
            <span className="text-text-primary font-medium">{emailParam}</span>.
            Click it to activate your account.
          </>
        ) : (
          <>We sent you a verification link. Check your inbox to continue.</>
        )}
      </p>

      <div className="space-y-3">
        {emailParam && (
          <Button onClick={handleResend} className="w-full" disabled={resending || resent}>
            {resending ? "Sending..." : resent ? "Email sent" : "Resend email"}
          </Button>
        )}
        <p className="text-[11px] text-text-muted text-center">
          Didn&apos;t get it? Check your spam folder, or resend above.
        </p>
        <p className="text-[13px] text-text-muted text-center mt-2">
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
