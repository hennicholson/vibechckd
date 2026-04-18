"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h2" />
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

function IconArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WalletState = "loading" | "not-connected" | "connected" | "error";

interface WhopWalletProps {
  availableCents: number;
  onWithdrawalComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhopWallet({ availableCents, onWithdrawalComplete }: WhopWalletProps) {
  const { toast } = useToast();
  const [state, setState] = useState<WalletState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [whopElements, setWhopElements] = useState<any>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/whop-token");
      if (!res.ok) {
        setState("not-connected");
        return;
      }
      const data = await res.json();
      if (data.connected && data.token && data.companyId) {
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
      });
  }, [state, token]);

  const handleWithdraw = async () => {
    const rawAmount = withdrawAmount.replace(/[$,]/g, "");
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast("Enter a valid amount");
      return;
    }
    const amountCents = Math.round(parsed * 100);
    if (amountCents > availableCents) {
      toast("Amount exceeds available balance");
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Withdrawal failed");
        setWithdrawing(false);
        return;
      }

      const feeDisplay = data.feeAmount
        ? ` (fee: $${(data.feeAmount / 100).toFixed(2)})`
        : "";
      toast(`Withdrawal of $${parsed.toFixed(2)} initiated${feeDisplay}`);
      setShowWithdraw(false);
      setWithdrawAmount("");
      onWithdrawalComplete?.();

      // If payout portal URL returned, open it so creator can claim funds
      if (data.payoutPortalUrl) {
        window.open(data.payoutPortalUrl, "_blank");
      }
    } catch {
      toast("Withdrawal failed");
    }
    setWithdrawing(false);
  };

  const maxDollars = availableCents / 100;

  // ---------- Loading ----------
  if (state === "loading") {
    return (
      <div className="border border-border rounded-[10px] p-5 mb-6">
        <div className="h-20 bg-surface-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  // ---------- Not Connected / Show Withdraw ----------
  if (state === "not-connected" || state === "error") {
    return (
      <div className="border border-border rounded-[10px] overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWallet />
            <span className="text-[14px] font-medium text-text-primary">Cash Out</span>
          </div>
          {availableCents > 0 && (
            <span className="text-[15px] font-semibold text-positive tabular-nums">
              ${maxDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="p-5">
          <p className="text-[13px] text-text-secondary leading-relaxed mb-4">
            {availableCents > 0
              ? "Withdraw your earnings to your bank account, Venmo, CashApp, or crypto."
              : "When you receive payments, you can withdraw them here."}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Always show withdraw button */}
            <button
              onClick={() => setShowWithdraw(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors cursor-pointer"
            >
              <IconArrowDown />
              Withdraw
            </button>

            {/* Payout portal -- manage payout methods on Whop */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/payout-portal");
                  if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                      window.open(data.url, "_blank");
                      return;
                    }
                  }
                  // If no portal available, try creating account first via withdraw
                  toast("Set up your payout method by making your first withdrawal");
                  setShowWithdraw(true);
                } catch {
                  toast("Set up your payout method by making your first withdrawal");
                  setShowWithdraw(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-text-secondary border border-border rounded-lg hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              Payout settings
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted"><IconShield /></span>
            <span className="text-[10px] text-text-muted">Bank, Venmo, CashApp, crypto -- powered by Whop Payments</span>
          </div>
        </div>

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
            <div className="relative bg-background border border-border rounded-xl shadow-lg w-full max-w-[420px] mx-4 animate-[fadeInUp_0.2s_ease-out]">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconWallet />
                    <h2 className="text-[16px] font-semibold text-text-primary">Withdraw</h2>
                  </div>
                  <button onClick={() => setShowWithdraw(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
                    <IconX />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="mb-4">
                  <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-text-muted font-medium">$</span>
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className="w-full text-[24px] font-semibold text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-lg pl-9 pr-4 py-3 outline-none focus:border-border-hover transition-colors tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-text-muted">
                      Available: ${maxDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setWithdrawAmount(maxDollars.toFixed(2))}
                      className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      Withdraw all
                    </button>
                  </div>
                </div>

                <div className="bg-surface-muted rounded-lg p-3 mb-5 text-[12px] text-text-secondary leading-relaxed">
                  Whop processing fees will be deducted from your withdrawal. If this is your first withdrawal, a Whop Payments account will be created for you to set up your payout method.
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount.trim() || withdrawing}
                  className="w-full py-3 text-[14px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {withdrawing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <IconArrowDown />
                      Withdraw
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Connected -- show Whop Elements ----------
  if (state === "connected" && whopElements && token && companyId) {
    const { react: WhopReact, loader } = whopElements;
    const els = loader();
    const { Elements, PayoutsSession, BalanceElement, WithdrawButtonElement, WithdrawalsElement } = WhopReact;

    return (
      <div className="border border-border rounded-[10px] overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWallet />
            <span className="text-[14px] font-medium text-text-primary">Whop Wallet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-positive"><IconShield /></span>
            <span className="text-[11px] text-text-muted">Connected</span>
          </div>
        </div>
        <div className="p-5">
          <Elements
            appearance={{
              classes: {
                ".Button": { height: "40px", "border-radius": "8px", "font-size": "13px", "font-weight": "500" },
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
                  showWithdrawButton={false}
                  fallback={<div className="h-20 bg-surface-muted rounded-lg animate-pulse" />}
                />
                <WithdrawButtonElement
                  size="3"
                  variant="solid"
                  fallback={<div className="h-10 bg-surface-muted rounded-lg animate-pulse" />}
                />
                <WithdrawalsElement
                  fallback={<div className="h-16 bg-surface-muted rounded-lg animate-pulse" />}
                />
              </div>
            </PayoutsSession>
          </Elements>
        </div>

        {/* Also show our withdraw button for the platform balance */}
        {availableCents > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-muted">
                Platform balance: ${maxDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer"
              >
                <IconArrowDown />
                Transfer to wallet
              </button>
            </div>
          </div>
        )}

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
            <div className="relative bg-background border border-border rounded-xl shadow-lg w-full max-w-[420px] mx-4 animate-[fadeInUp_0.2s_ease-out]">
              <div className="px-6 py-5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconWallet />
                    <h2 className="text-[16px] font-semibold text-text-primary">Transfer to Whop Wallet</h2>
                  </div>
                  <button onClick={() => setShowWithdraw(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
                    <IconX />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="mb-4">
                  <label className="text-[12px] font-medium text-text-secondary mb-1.5 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-text-muted font-medium">$</span>
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className="w-full text-[24px] font-semibold text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-lg pl-9 pr-4 py-3 outline-none focus:border-border-hover transition-colors tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-text-muted">
                      Available: ${maxDollars.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => setWithdrawAmount(maxDollars.toFixed(2))}
                      className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      Transfer all
                    </button>
                  </div>
                </div>

                <div className="bg-surface-muted rounded-lg p-3 mb-5 text-[12px] text-text-secondary leading-relaxed">
                  This transfers funds from your vibechckd balance to your Whop Wallet. From there you can withdraw to your bank, Venmo, CashApp, or crypto. Processing fees are deducted from the transfer.
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount.trim() || withdrawing}
                  className="w-full py-3 text-[14px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {withdrawing ? "Processing..." : "Transfer to wallet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback
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
