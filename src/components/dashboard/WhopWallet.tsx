"use client";

import { useState, useEffect, useCallback } from "react";

// Icons
function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h2" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

type WhopWalletState = "loading" | "not-connected" | "connected" | "error";

export default function WhopWallet() {
  const [state, setState] = useState<WhopWalletState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [whopElements, setWhopElements] = useState<any>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/whop-token");
      if (!res.ok) {
        setState("not-connected");
        return;
      }
      const data = await res.json();
      if (data.token && data.companyId) {
        setToken(data.token);
        setCompanyId(data.companyId);
        setState("connected");
      } else {
        setState("not-connected");
      }
    } catch {
      setState("not-connected");
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Load Whop Elements when connected
  useEffect(() => {
    if (state !== "connected" || !token) return;

    Promise.all([
      import("@whop/embedded-components-vanilla-js"),
      import("@whop/embedded-components-react-js"),
    ])
      .then(([vanillaModule, reactModule]) => {
        const loader = vanillaModule.loadWhopElements || vanillaModule.default?.loadWhopElements;
        if (typeof loader === "function") {
          setWhopElements({ loader, react: reactModule });
        }
      })
      .catch((err) => {
        console.error("Failed to load Whop Elements:", err);
        setState("error");
      });
  }, [state, token]);

  if (state === "loading") {
    return (
      <div className="border border-border rounded-[10px] p-5 mb-6">
        <div className="h-20 bg-surface-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  // Not connected -- show setup prompt
  if (state === "not-connected" || state === "error") {
    return (
      <div className="border border-border rounded-[10px] overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <IconWallet />
          <span className="text-[14px] font-medium text-text-primary">Cash Out</span>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
            To withdraw your earnings, connect a payout method through Whop Payments. Whop supports bank transfers (241+ countries), Venmo, CashApp, and crypto.
          </p>

          <div className="space-y-2 mb-5">
            {[
              "Secure identity verification",
              "Bank, Venmo, CashApp, or crypto payouts",
              "Withdrawals typically process in 1-3 days",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-positive"><IconCheck /></span>
                <span className="text-[12px] text-text-secondary">{item}</span>
              </div>
            ))}
          </div>

          <a
            href="https://whop.com/dashboard/settings/payouts/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors no-underline"
          >
            Set up payouts
            <IconExternalLink />
          </a>

          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-text-muted"><IconShield /></span>
            <span className="text-[11px] text-text-muted">Powered by Whop Payments -- secure, global payment processing</span>
          </div>
        </div>
      </div>
    );
  }

  // Connected with Whop Elements loaded
  if (state === "connected" && whopElements && token && companyId) {
    const { react: WhopReact, loader } = whopElements;
    const els = loader();
    const { Elements, PayoutsSession, BalanceElement, WithdrawalsElement } = WhopReact;

    return (
      <div className="border border-border rounded-[10px] overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWallet />
            <span className="text-[14px] font-medium text-text-primary">Cash Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-positive"><IconShield /></span>
            <span className="text-[11px] text-text-muted">Whop Payments</span>
          </div>
        </div>
        <div className="p-5">
          <Elements
            appearance={{
              classes: {
                ".Button": { height: "36px", "border-radius": "8px", "font-size": "13px" },
                ".Container": { "border-radius": "10px" },
              },
            }}
            elements={els}
          >
            <PayoutsSession
              token={() => Promise.resolve(token)}
              companyId={companyId}
              redirectUrl={typeof window !== "undefined" ? `${window.location.origin}/dashboard/earnings` : "https://vibechckd.cc/dashboard/earnings"}
            >
              <div className="space-y-4">
                <BalanceElement
                  showWithdrawButton={true}
                  fallback={<div className="h-20 bg-surface-muted rounded-lg animate-pulse" />}
                />
                <WithdrawalsElement
                  fallback={<div className="h-16 bg-surface-muted rounded-lg animate-pulse" />}
                />
              </div>
            </PayoutsSession>
          </Elements>
        </div>
      </div>
    );
  }

  // Fallback while elements are loading
  return (
    <div className="border border-border rounded-[10px] p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <IconWallet />
        <span className="text-[14px] font-medium text-text-primary">Cash Out</span>
      </div>
      <div className="h-20 bg-surface-muted rounded-lg animate-pulse" />
    </div>
  );
}
