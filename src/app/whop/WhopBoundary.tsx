"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  handoff: string | null;
  error: string | null;
  alreadySignedIn?: boolean;
}

export default function WhopBoundary({ handoff, error: serverError, alreadySignedIn }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(serverError);
  const [phase, setPhase] = useState<"idle" | "signing" | "ready" | "error">(
    alreadySignedIn ? "ready" : serverError ? "error" : handoff ? "signing" : "error"
  );

  useEffect(() => {
    if (alreadySignedIn) {
      // Server already detected the session and rendered the marketplace
      // inline — nothing to do here.
      return;
    }
    if (!handoff || error) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await signIn("whop", { handoff, redirect: false });
        if (cancelled) return;
        if (res?.ok) {
          setPhase("ready");
          // Stay on /whop and re-render the server component so the session
          // path (which renders <BrowsePage /> inline) takes over. We don't
          // navigate to /browse because /browse ships X-Frame-Options: DENY
          // and would be blocked inside Whop's iframe.
          router.refresh();
        } else {
          setPhase("error");
          setError(res?.error || "Sign-in failed");
        }
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Sign-in failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handoff, error, alreadySignedIn, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-text-primary mb-6">
          <span>vibechckd</span>
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-text-primary text-white">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>

        {phase === "signing" && (
          <>
            <div className="mx-auto w-8 h-8 mb-4 relative">
              <span className="absolute inset-0 rounded-full border-2 border-border" />
              <span className="absolute inset-0 rounded-full border-2 border-text-primary border-t-transparent border-r-transparent animate-spin" />
            </div>
            <p className="text-[13px] text-text-secondary">Signing you in via Whop…</p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-1">
              one second
            </p>
          </>
        )}

        {phase === "ready" && (
          <p className="text-[13px] text-text-secondary">Loading marketplace…</p>
        )}

        {phase === "error" && (
          <div className="border border-border rounded-lg p-5 text-left">
            <p className="text-[13px] font-medium text-text-primary mb-1">
              Couldn&apos;t sign you in
            </p>
            <p className="text-[12px] text-text-muted leading-relaxed">
              {error || "We couldn't verify your Whop session."}
            </p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mt-3">
              Try refreshing this panel inside Whop — or open vibechckd.cc directly.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
