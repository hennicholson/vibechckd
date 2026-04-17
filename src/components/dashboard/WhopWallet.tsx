"use client";

import { useState, useEffect } from "react";

export default function WhopWallet() {
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [elements, setElements] = useState<any>(null);

  useEffect(() => {
    // Fetch token from our API
    fetch("/api/whop-token")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get token");
        return res.json();
      })
      .then((data) => {
        setToken(data.token);
        setCompanyId(data.companyId);
      })
      .catch((err) => {
        console.error("WhopWallet: token fetch failed:", err);
        setError("Could not connect to payment provider");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token || !companyId) return;

    // Dynamically import Whop Elements to avoid SSR issues
    Promise.all([
      import("@whop/embedded-components-vanilla-js"),
      import("@whop/embedded-components-react-js"),
    ])
      .then(([vanillaModule, reactModule]) => {
        const loadWhopElements = vanillaModule.loadWhopElements || vanillaModule.default?.loadWhopElements;
        if (loadWhopElements) {
          setElements({
            loader: loadWhopElements,
            react: reactModule,
          });
        }
      })
      .catch((err) => {
        console.error("WhopWallet: failed to load Whop Elements:", err);
        setError("Payment components unavailable");
      });
  }, [token, companyId]);

  if (loading) {
    return (
      <div className="border border-border rounded-[10px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
          </svg>
          <span className="text-[14px] font-medium text-text-primary">Whop Wallet</span>
        </div>
        <div className="h-24 bg-surface-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border rounded-[10px] p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M16 14h2" />
          </svg>
          <span className="text-[14px] font-medium text-text-primary">Whop Wallet</span>
        </div>
        <p className="text-[12px] text-text-muted">{error}</p>
        <p className="text-[11px] text-text-muted mt-1">
          Your balance and withdrawals are tracked below in the transaction history.
        </p>
      </div>
    );
  }

  if (!token || !companyId || !elements) {
    return null;
  }

  // Render Whop Elements
  const { react: WhopReact, loader } = elements;
  const whopElements = loader();
  const { Elements, PayoutsSession, BalanceElement, WithdrawButtonElement, WithdrawalsElement } = WhopReact;

  return (
    <div className="border border-border rounded-[10px] overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M16 14h2" />
        </svg>
        <span className="text-[14px] font-medium text-text-primary">Whop Wallet</span>
        <span className="text-[11px] text-text-muted ml-auto">Powered by Whop Payments</span>
      </div>
      <div className="p-5">
        <Elements
          appearance={{
            classes: {
              ".Button": { height: "36px", "border-radius": "8px", "font-size": "13px" },
              ".Container": { "border-radius": "10px" },
            },
          }}
          elements={whopElements}
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
