"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import dynamic from "next/dynamic";

// Lazy load Whop Elements to avoid SSR issues
const WhopWallet = dynamic(() => import("@/components/dashboard/WhopWallet"), {
  ssr: false,
  loading: () => (
    <div className="border border-border rounded-[10px] p-6 mb-6">
      <div className="h-32 bg-surface-muted rounded animate-pulse" />
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BalanceData {
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
  totalWithdrawnCents: number;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  description: string;
  createdAt: string;
  completedAt: string | null;
  projectId: string | null;
  invoiceId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(type: string): string {
  switch (type) {
    case "invoice_payment": return "Invoice";
    case "direct_payment": return "Payment";
    case "withdrawal": return "Withdrawal";
    case "refund": return "Refund";
    case "platform_fee": return "Fee";
    default: return type;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "completed": return "text-positive";
    case "pending": return "text-warning";
    case "failed": return "text-negative";
    case "cancelled": return "text-text-muted";
    default: return "text-text-muted";
  }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h2" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Withdraw Modal
// ---------------------------------------------------------------------------

function WithdrawModal({
  availableCents,
  onClose,
  onSubmit,
  submitting,
}: {
  availableCents: number;
  onClose: () => void;
  onSubmit: (amountCents: number) => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const maxDollars = availableCents / 100;
  const parsed = parseFloat(amount.replace(/[$,]/g, ""));
  const isValid = !isNaN(parsed) && parsed > 0 && parsed <= maxDollars;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-lg w-full max-w-[420px] mx-4 animate-[fadeInUp_0.2s_ease-out]">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWallet />
              <h2 className="text-[16px] font-semibold text-text-primary">Withdraw funds</h2>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full text-[24px] font-semibold text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-lg pl-9 pr-4 py-3 outline-none focus:border-border-hover transition-colors tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-text-muted">
                Available: {formatCurrency(availableCents)}
              </span>
              <button
                onClick={() => setAmount(maxDollars.toFixed(2))}
                className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Withdraw all
              </button>
            </div>
          </div>

          <div className="bg-surface-muted rounded-lg p-3 mb-5">
            <div className="flex items-start gap-2">
              <span className="text-text-muted mt-0.5"><IconInfo /></span>
              <div>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  Withdrawals are processed through Whop Payments. Funds are sent to your connected payout method (bank account, Venmo, CashApp, or crypto).
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  Processing time varies by method. Typically 1-3 business days.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (isValid) onSubmit(Math.round(parsed * 100));
            }}
            disabled={!isValid || submitting}
            className="w-full py-3 text-[14px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
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
                Withdraw {isValid ? formatCurrency(Math.round(parsed * 100)) : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type FilterTab = "all" | "invoice_payment" | "direct_payment" | "withdrawal";

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "invoice_payment", label: "Invoices" },
  { key: "direct_payment", label: "Payments" },
  { key: "withdrawal", label: "Withdrawals" },
];

export default function EarningsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalTx, setTotalTx] = useState(0);
  const limit = 20;

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (err) { console.error("Failed to fetch balance:", err); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const typeParam = activeFilter !== "all" ? `&type=${activeFilter}` : "";
      const res = await fetch(`/api/balance/transactions?page=${page}&limit=${limit}${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalTx(data.total || 0);
      }
    } catch (err) { console.error("Failed to fetch transactions:", err); }
  }, [activeFilter, page]);

  useEffect(() => {
    Promise.all([fetchBalance(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchBalance, fetchTransactions]);

  const handleWithdraw = async (amountCents: number) => {
    setWithdrawing(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Withdrawal failed");
        setWithdrawing(false);
        return;
      }

      toast("Withdrawal requested -- processing");
      setShowWithdraw(false);
      await fetchBalance();
      await fetchTransactions();
    } catch (err) {
      console.error("Withdrawal failed:", err);
      toast("Withdrawal failed");
    }
    setWithdrawing(false);
  };

  const totalPages = Math.ceil(totalTx / limit);

  if (loading) {
    return (
      <div className="max-w-3xl px-4 md:px-8 py-6">
        <div className="h-6 w-32 bg-surface-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-muted rounded-[10px] animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-surface-muted rounded-[10px] animate-pulse" />
      </div>
    );
  }

  const avail = balance?.availableCents || 0;
  const pending = balance?.pendingCents || 0;
  const earned = balance?.totalEarnedCents || 0;
  const withdrawn = balance?.totalWithdrawnCents || 0;

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Earnings</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Track your income and manage withdrawals</p>
        </div>
        <button
          onClick={() => setShowWithdraw(true)}
          disabled={avail <= 0}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#171717] text-white rounded-lg hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <IconArrowDown />
          Withdraw
        </button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Available - highlighted */}
        <div className="border border-border rounded-[10px] p-4 bg-surface-muted">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-text-secondary"><IconWallet /></span>
            <p className="text-[11px] font-mono uppercase text-text-muted">Available</p>
          </div>
          <p className="text-[28px] font-semibold text-text-primary tabular-nums tracking-tight">
            {formatCurrency(avail)}
          </p>
        </div>

        <div className="border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-warning"><IconClock /></span>
            <p className="text-[11px] font-mono uppercase text-text-muted">Pending</p>
          </div>
          <p className="text-[24px] font-semibold text-text-primary tabular-nums tracking-tight">
            {formatCurrency(pending)}
          </p>
        </div>

        <div className="border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-positive"><IconTrendUp /></span>
            <p className="text-[11px] font-mono uppercase text-text-muted">Total earned</p>
          </div>
          <p className="text-[24px] font-semibold text-text-primary tabular-nums tracking-tight">
            {formatCurrency(earned)}
          </p>
        </div>

        <div className="border border-border rounded-[10px] p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-text-muted"><IconArrowDown /></span>
            <p className="text-[11px] font-mono uppercase text-text-muted">Withdrawn</p>
          </div>
          <p className="text-[24px] font-semibold text-text-primary tabular-nums tracking-tight">
            {formatCurrency(withdrawn)}
          </p>
        </div>
      </div>

      {/* Whop Wallet - native balance & withdrawal */}
      <WhopWallet />

      {/* How it works section */}
      {earned === 0 && (
        <div className="border border-border rounded-[10px] p-5 mb-8">
          <h3 className="text-[14px] font-medium text-text-primary mb-3">How earnings work</h3>
          <div className="space-y-3">
            {[
              {
                title: "Receive payments",
                desc: "When clients pay your invoices or send direct payments, the funds appear in your balance.",
              },
              {
                title: "Track everything",
                desc: "Every transaction -- invoices, payments, and withdrawals -- is recorded here.",
              },
              {
                title: "Withdraw anytime",
                desc: "Cash out to your bank account, Venmo, CashApp, or crypto through Whop Payments.",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-mono text-text-muted">{i + 1}</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-text-primary">{step.title}</p>
                  <p className="text-[12px] text-text-muted mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="border border-border rounded-[10px] overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-text-primary">Transaction history</h3>
            <span className="text-[11px] font-mono text-text-muted">{totalTx} total</span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mt-3">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveFilter(tab.key);
                  setPage(1);
                }}
                className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                  activeFilter === tab.key
                    ? "bg-surface-muted text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-text-muted">No transactions yet</p>
            <p className="text-[12px] text-text-muted mt-1">
              Transactions will appear here when you receive payments or make withdrawals
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const isCredit = tx.amountCents > 0;
              const hasProject = !!tx.projectId;
              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (hasProject) router.push(`/dashboard/projects/${tx.projectId}`);
                  }}
                  className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${
                    hasProject ? "hover:bg-surface-muted/50 cursor-pointer" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCredit ? "bg-positive/10 text-positive" : "bg-surface-muted text-text-muted"
                  }`}>
                    {tx.type === "withdrawal" ? <IconArrowDown /> : isCredit ? <IconTrendUp /> : <IconArrowDown />}
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-text-muted">{formatDate(tx.createdAt)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-medium">
                        {typeLabel(tx.type)}
                      </span>
                      {hasProject && (
                        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                          View in chat
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[14px] font-semibold tabular-nums ${isCredit ? "text-positive" : "text-text-primary"}`}>
                      {isCredit ? "+" : ""}{formatCurrency(Math.abs(tx.amountCents))}
                    </p>
                    <div className={`flex items-center gap-1 justify-end mt-0.5 ${statusColor(tx.status)}`}>
                      {tx.status === "completed" && <IconCheck />}
                      {tx.status === "pending" && <IconClock />}
                      {tx.status === "failed" && <IconX />}
                      <span className="text-[10px] font-medium capitalize">{tx.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[11px] font-mono text-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <WithdrawModal
          availableCents={avail}
          onClose={() => setShowWithdraw(false)}
          onSubmit={handleWithdraw}
          submitting={withdrawing}
        />
      )}
    </div>
  );
}
