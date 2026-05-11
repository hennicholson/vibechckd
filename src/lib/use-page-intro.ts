"use client";

import { useCallback, useState } from "react";

/**
 * usePageIntro — gates the per-tab brand intro to once per session.
 *
 * Tab pages get a Lottie+wordmark intro on first entry; subsequent
 * visits within the same browser session skip straight to content so
 * navigation between tabs doesn't grind to a halt.
 *
 * Pass `null` to opt out of session-skipping (used on /browse, where
 * the vetted mark is re-asserted on every entry by design).
 */
export function usePageIntro(storageKey: string | null) {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    if (!storageKey) return true;
    try {
      return sessionStorage.getItem(storageKey) !== "1";
    } catch {
      return true;
    }
  });

  const markDone = useCallback(() => {
    setShow(false);
    if (!storageKey || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Sandboxed / private-mode contexts — degrade silently.
    }
  }, [storageKey]);

  return [show, markDone] as const;
}
