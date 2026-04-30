"use client";

import { useEffect, useState } from "react";
import { useIframeSdk } from "@whop/react";

// Detects whether the app is rendered inside Whop's iframe and exposes the
// SDK alongside an `isInIframe` flag so components can branch:
//
//   const { isInIframe, sdk } = useWhopIframeContext();
//   if (isInIframe) sdk.openExternalUrl({ url });
//   else window.open(url, "_blank");
//
// `useIframeSdk` from @whop/react throws when the provider is missing — we
// always wrap the tree in `<WhopIframeSdkProvider>` (see app/layout.tsx) so
// the hook is safe to call in any client component. The provider itself
// works in both contexts; the difference is whether postmessage replies
// arrive (they only do inside the Whop iframe).
//
// Detection: `window.parent !== window` is the standard tell. We compute it
// after hydration to avoid SSR/CSR mismatch (server has no window).
export function useWhopIframeContext() {
  const sdk = useIframeSdk();
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsInIframe(window.parent !== window);
    } catch {
      // Cross-origin access on `window.parent` throws — that itself is a
      // strong signal we're in a third-party iframe (Whop's case).
      setIsInIframe(true);
    }
  }, []);

  return { isInIframe, sdk };
}
