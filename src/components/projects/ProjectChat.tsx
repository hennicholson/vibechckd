"use client";

import { Fragment, useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "../Toast";
import { useConversationStream } from "@/lib/use-conversation-stream";
import { useWhopIframeContext } from "@/lib/use-whop-iframe";
import { useTypingIndicator } from "@/lib/use-typing-indicator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageType = "text" | "file" | "system" | "ai" | "invoice";
type ActiveAction = "invoice" | "proposal" | "milestone" | "files" | "task" | "payment" | null;

interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: MessageType;
  fileUrl: string | null;
  createdAt: string;
  invoiceId?: string | null;
  // Hydrated structured invoice (when messageType === 'invoice'). Replaces
  // the fragile parseInvoiceContent() text-parsing path — the new /api/messages
  // shim joins to the invoices table and inlines the row.
  invoice?: {
    id: string;
    description: string;
    amountCents: number;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
    paymentUrl: string | null;
    senderId: string | null;
    recipientId: string | null;
  } | null;
}

interface InvoiceData {
  id: string;
  whopInvoiceId: string | null;
  description: string;
  amountCents: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentUrl: string | null;
  senderId: string | null;
  recipientId: string | null;
  senderName?: string;
  recipientName?: string;
  splits?: { userId: string; userName: string; amountCents: number; paid: boolean }[];
}

interface ParsedInvoice {
  description: string | null;
  amount: string | null;
  due: string | null;
  status: string;
  invoiceId: string | null;
  payUrl: string | null;
  from: string | null;
  to: string | null;
}

interface ParsedProposal {
  scope: string | null;
  budget: string | null;
  timeline: string | null;
}

interface ProjectBalance {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

interface ProjectMember {
  userId: string;
  name: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS = 2000;
const CHAR_WARN_THRESHOLD = 1800;
const POLL_INTERVAL = 4000;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function getFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() || "file");
  } catch {
    return "file";
  }
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

// True when both ISO timestamps fall on the same calendar day in the
// viewer's local timezone. Used to gate "Today / Yesterday / <date>"
// dividers in the chat feed.
function sameLocalDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayDividerLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (sameLocalDay(iso, today.toISOString())) return "Today";
  if (sameLocalDay(iso, yest.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// Slash-command parser for the composer. Returns null when the input
// doesn't match a known shape so the caller can fall through to a normal
// message send.
//
// Supported (loose grammar — any combination, any order after `/invoice`):
//
//   /invoice 250
//   /invoice $250 for site copy
//   /invoice 1500.00 for landing page revisions due 2026-05-15
//   /invoice 250 due Friday for that thing
//
// Date strings are passed through as-is; the InvoiceForm renders a date
// picker for refinement, and ad-hoc strings ("Friday") become an empty
// initialDue (the input ignores invalid dates).
type SlashCommand = {
  kind: "invoice";
  amountDollars: string;
  description?: string;
  due?: string;
};

function parseSlashCommand(text: string): SlashCommand | null {
  if (!text.startsWith("/invoice ")) return null;
  const rest = text.slice("/invoice ".length).trim();
  if (!rest) return null;

  // Amount is the first token. Strip leading $ and trailing commas.
  const tokens = rest.split(/\s+/);
  const amountToken = (tokens.shift() || "").replace(/[$,]/g, "");
  const amountNum = parseFloat(amountToken);
  if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
  const amountDollars = amountNum.toFixed(2).replace(/\.00$/, "");

  let description: string | undefined;
  let due: string | undefined;
  let remainder = tokens.join(" ").trim();

  // `due <…>` and `for <…>` consume to the end / next keyword.
  const dueMatch = remainder.match(/(?:^|\s)due\s+(.+?)(?:\s+for\s+|$)/i);
  if (dueMatch) {
    due = dueMatch[1].trim();
    remainder = remainder.replace(dueMatch[0], " ").trim();
  }
  const forMatch = remainder.match(/(?:^|\s)for\s+(.+?)(?:\s+due\s+|$)/i);
  if (forMatch) {
    description = forMatch[1].trim();
    remainder = remainder.replace(forMatch[0], " ").trim();
  }
  // Anything still in `remainder` becomes the description if unset.
  if (!description && remainder) description = remainder;

  // If `due` was a calendar date in YYYY-MM-DD shape, keep it. Anything
  // free-form gets dropped — the form's <input type=date> can't render it.
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (due && !ymd.test(due)) due = undefined;

  return { kind: "invoice", amountDollars, description, due };
}

function parseInvoiceContent(content: string): ParsedInvoice | null {
  if (!content.includes("INVOICE")) return null;
  // Only render as a card for INVOICE SENT messages (with Amount/Description fields)
  // INVOICE PAID / INVOICE VOIDED / INVOICE PAST DUE are status updates -> render as system messages
  if (!content.includes("Amount:") && !content.includes("Description:")) return null;
  const lines = content.split("\n");

  let status = "Pending";
  const firstLine = lines[0] || "";
  if (firstLine.includes("PAID")) status = "Paid";
  else if (firstLine.includes("VOIDED")) status = "Voided";
  else if (firstLine.includes("PAST DUE")) status = "Overdue";
  else if (firstLine.includes("SENT")) status = "Pending";

  let description: string | null = null;
  let amount: string | null = null;
  let due: string | null = null;
  let invoiceId: string | null = null;
  let payUrl: string | null = null;
  let from: string | null = null;
  let to: string | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("Description:")) description = t.slice(12).trim();
    else if (t.startsWith("Amount:")) amount = t.slice(7).trim();
    else if (t.startsWith("Due:")) due = t.slice(4).trim();
    else if (t.startsWith("From:")) from = t.slice(5).trim();
    else if (t.startsWith("To:")) to = t.slice(3).trim();
    else if (t.startsWith("Status:")) {
      const s = t.slice(7).trim();
      if (s) status = s;
    } else if (t.startsWith("Invoice ID:") || t.startsWith("Invoice ")) {
      const m = t.match(/Invoice(?:\s+ID)?:?\s+(.+)/);
      if (m) invoiceId = m[1].trim();
    } else if (t.startsWith("Pay:")) payUrl = t.slice(4).trim();
  }

  return { description, amount, due, status, invoiceId, payUrl, from, to };
}

function parseProposalContent(content: string): ParsedProposal | null {
  if (!content.includes("PROPOSAL")) return null;
  const lines = content.split("\n");

  let scope: string | null = null;
  let budget: string | null = null;
  let timeline: string | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("Scope:")) scope = t.slice(6).trim();
    else if (t.startsWith("Budget:")) budget = t.slice(7).trim();
    else if (t.startsWith("Timeline:")) timeline = t.slice(9).trim();
  }

  return { scope, budget, timeline };
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "#22c55e";
  if (s === "pending" || s === "sent") return "#f59e0b";
  if (s === "overdue" || s === "past_due" || s === "past due") return "#ef4444";
  if (s === "voided" || s === "draft" || s === "uncollectible") return "#a3a3a3";
  return "#a3a3a3";
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "sent") return "Pending";
  if (s === "past_due" || s === "past due") return "Overdue";
  if (s === "voided") return "Voided";
  if (s === "draft") return "Draft";
  if (s === "uncollectible") return "Uncollectible";
  return status;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, no emojis)
// ---------------------------------------------------------------------------

function IconSend({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconChat({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconInvoice({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <line x1="8" y1="17" x2="10" y2="17" />
      <path d="M16 17l2-2-2-2" />
    </svg>
  );
}

function IconProposal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

function IconMilestone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function IconTask({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconPaperclip({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function IconDollar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconRefresh({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  );
}

function IconMail({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function IconSplit({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 009 9" />
    </svg>
  );
}

function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconWallet({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h2" />
    </svg>
  );
}

function IconClock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconExternalLink({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1 py-6 animate-pulse">
      <div className="flex gap-2 max-w-[65%]">
        <div className="w-[200px] h-[36px] rounded-[16px] rounded-bl-[4px] bg-surface-muted" />
      </div>
      <div className="flex gap-2 max-w-[55%] self-end">
        <div className="w-[160px] h-[36px] rounded-[16px] rounded-br-[4px] bg-surface-muted" />
      </div>
      <div className="flex gap-2 max-w-[70%]">
        <div className="w-[240px] h-[36px] rounded-[16px] rounded-bl-[4px] bg-surface-muted" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
      <IconChat />
      <div className="text-center">
        <p className="text-[14px] font-medium text-text-primary">Start the conversation</p>
        <p className="text-[13px] text-text-muted mt-0.5">Send a message or use the quick actions below</p>
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  // Strip emojis from system messages for clean display
  const clean = content.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").trim();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[12px] text-text-muted italic font-body whitespace-nowrap px-1">{clean}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// --- Pay Invoice Button ---
//
// Splits the click target between two contexts:
//   - Inside the Whop iframe: hand the URL to the iframe SDK so Whop opens
//     it in-app (their UI overlays the checkout, returns control to us
//     after). This is the canonical embedded-payment flow per @whop/iframe.
//   - Standalone vibechckd.cc: window.open in a new tab.
//
// The button looks identical in both contexts so no visual flicker on the
// iframe-detection hydration.

function PayInvoiceButton({ url }: { url: string }) {
  const { isInIframe, sdk } = useWhopIframeContext();
  const onClick = () => {
    if (isInIframe) {
      sdk.openExternalUrl({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer"
    >
      <IconWallet size={12} />
      Pay now
    </button>
  );
}

// --- Invoice Card ---

function InvoiceCard({
  invoice,
  currentUserName,
  isSender,
  onCheckStatus,
  onSendEmail,
  checking,
}: {
  invoice: ParsedInvoice;
  currentUserName?: string;
  isSender: boolean;
  onCheckStatus?: (invoiceId: string) => void;
  onSendEmail?: (invoiceId: string) => void;
  checking?: boolean;
}) {
  const dotColor = statusColor(invoice.status);
  const label = statusLabel(invoice.status);
  const isPaid = invoice.status.toLowerCase() === "paid";
  const isVoided = invoice.status.toLowerCase() === "voided";

  // Perspective-aware labels
  const fromName = invoice.from || "Creator";
  const toName = invoice.to || "Client";
  const contextLine = isSender
    ? `You sent this to ${toName}`
    : `${fromName} sent this to you`;

  return (
    <div className={`bg-surface-muted rounded-lg overflow-hidden max-w-[calc(100vw-48px)] sm:max-w-[340px] w-full ${isPaid ? "ring-1 ring-positive/20" : ""}`}>
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between ${isPaid ? "bg-positive/5" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary"><IconInvoice size={14} /></span>
          <span className="text-[13px] font-medium text-text-primary">Invoice</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[11px] font-medium" style={{ color: dotColor }}>{label}</span>
        </div>
      </div>

      {/* From / To context */}
      <div className="px-4 py-2 border-t border-border/50">
        <p className="text-[11px] text-text-muted">{contextLine}</p>
      </div>

      {/* Body */}
      <div className="px-3 py-2 border-t border-border/50">
        {invoice.description && (
          <p className="text-[13px] text-text-secondary leading-snug mb-2">{invoice.description}</p>
        )}

        {invoice.amount && (
          <p className="text-[20px] font-semibold text-text-primary tabular-nums tracking-tight mb-2">{invoice.amount}</p>
        )}

        <div className="flex items-center gap-3">
          {invoice.due && (
            <div className="flex items-center gap-1 text-text-muted">
              <IconClock />
              <span className="text-[11px]">Due {invoice.due}</span>
            </div>
          )}
          {invoice.invoiceId && (
            <span className="text-[10px] text-text-muted font-mono truncate max-w-[140px]">{invoice.invoiceId}</span>
          )}
        </div>
      </div>

      {/* Actions footer */}
      {(!isPaid && !isVoided) && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 flex-wrap">
          {/* Show Pay button only to the recipient. When running inside the
              Whop iframe the click is forwarded through `openExternalUrl` so
              Whop can route the user to its hosted checkout in-app. Outside
              the iframe (direct vibechckd.cc) we open in a new tab. */}
          {!isSender && invoice.payUrl && (
            <PayInvoiceButton url={invoice.payUrl} />
          )}
          {invoice.invoiceId && onCheckStatus && (
            <button
              onClick={() => onCheckStatus(invoice.invoiceId!)}
              disabled={checking}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
            >
              <IconRefresh size={11} />
              {checking ? "Checking..." : "Verify payment"}
            </button>
          )}
          {/* Show Email button only to the sender */}
          {isSender && invoice.invoiceId && onSendEmail && (
            <button
              onClick={() => onSendEmail(invoice.invoiceId!)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              <IconMail size={11} />
              Resend
            </button>
          )}
        </div>
      )}

      {isPaid && (
        <div className="px-3 py-2 border-t border-positive/10 bg-positive/5">
          <div className="flex items-center gap-1.5">
            <span className="text-positive"><IconCheck size={12} /></span>
            <span className="text-[11px] font-medium text-positive">
              {isSender ? "Payment received -- credited to your balance" : "Payment complete"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Proposal Card ---

function ProposalCard({ proposal, onAccept, isOwn, senderName }: { proposal: ParsedProposal; onAccept?: () => void; isOwn: boolean; senderName?: string | null }) {
  return (
    <div className="bg-surface-muted rounded-lg overflow-hidden max-w-[calc(100vw-48px)] sm:max-w-[320px] w-full">
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-text-secondary"><IconProposal size={14} /></span>
        <span className="text-[13px] font-medium text-text-primary">Project Proposal</span>
      </div>

      {/* Context line */}
      <div className="px-4 py-2 border-t border-border/50">
        <p className="text-[11px] text-text-muted">
          {isOwn ? "You sent this proposal" : `from ${senderName || "Creator"}`}
        </p>
      </div>

      <div className="px-3 py-2 border-t border-border">
        {proposal.scope && (
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Scope of Work</span>
            <p className="text-[13px] text-text-primary leading-relaxed mt-1">{proposal.scope}</p>
          </div>
        )}
        <div className="flex gap-6">
          {proposal.budget && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Budget</span>
              <p className="text-[15px] font-semibold text-text-primary mt-0.5 tabular-nums">{proposal.budget}</p>
            </div>
          )}
          {proposal.timeline && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Timeline</span>
              <p className="text-[15px] font-semibold text-text-primary mt-0.5">{proposal.timeline}</p>
            </div>
          )}
        </div>
      </div>

      {!isOwn && onAccept && (
        <div className="px-3 py-2 border-t border-border">
          <button
            onClick={onAccept}
            className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <IconCheck size={12} />
            Accept proposal
          </button>
        </div>
      )}
    </div>
  );
}

// --- File Card ---

function FileCard({ content, fileUrl }: { content: string; fileUrl: string | null }) {
  const url = fileUrl || "#";
  const name = content || getFileName(url);
  const showThumbnail = fileUrl && isImageUrl(fileUrl);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block no-underline max-w-[calc(100vw-48px)] sm:max-w-[280px] w-full">
      <div className="border border-border rounded-lg overflow-hidden hover:border-border-hover transition-colors">
        {showThumbnail && (
          <div className="bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={name} className="w-full h-auto max-h-[160px] object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2.5 p-2.5">
          <span className="text-text-muted flex-shrink-0"><IconFile /></span>
          <span className="text-[13px] text-text-primary truncate flex-1">{name}</span>
          <span className="text-text-muted flex-shrink-0 hover:text-text-primary transition-colors"><IconDownload /></span>
        </div>
      </div>
    </a>
  );
}

// --- Milestone Card ---

function MilestoneCard({ title, amount, status }: { title: string; amount?: string; status: string }) {
  const isPaid = status.toLowerCase() === "completed" || status.toLowerCase() === "paid";
  return (
    <div className="bg-surface-muted rounded-lg overflow-hidden max-w-[calc(100vw-48px)] sm:max-w-[320px] w-full">
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-text-secondary"><IconMilestone size={14} /></span>
        <span className="text-[13px] font-medium text-text-primary">Milestone</span>
      </div>
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[14px] font-medium text-text-primary mb-1">{title}</p>
        {amount && (
          <p className="text-[18px] font-semibold text-text-primary tabular-nums tracking-tight">{amount}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: isPaid ? "#22c55e" : "#f59e0b" }} />
          <span className="text-[11px] font-medium" style={{ color: isPaid ? "#22c55e" : "#f59e0b" }}>
            {isPaid ? "Completed" : "In Progress"}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Balance Bar ---

function BalanceBar({ balance }: { balance: ProjectBalance }) {
  const paid = balance.totalPaid;
  const total = balance.totalInvoiced;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-surface-muted/30">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <IconWallet size={12} />
        <span className="text-[11px] font-medium text-text-secondary">Balance</span>
      </div>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-positive rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-semibold text-text-primary tabular-nums">{formatCurrency(paid)}</span>
        <span className="text-[10px] text-text-muted">/ {formatCurrency(total)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline form components
// ---------------------------------------------------------------------------

function InvoiceForm({
  onSend,
  onCancel,
  sending,
  members,
  initialDescription,
  initialAmount,
  initialDue,
}: {
  onSend: (data: {
    description: string;
    amount: string;
    due: string;
    recipientEmail: string;
    splits: { userId: string; amountCents: number }[];
  }) => void;
  onCancel: () => void;
  sending: boolean;
  members: ProjectMember[];
  initialDescription?: string;
  initialAmount?: string;
  initialDue?: string;
}) {
  // initialX props let the slash composer (/invoice 250 for site copy)
  // pre-fill the form. They're only consumed on first render — subsequent
  // typing is owned by the form's local state.
  const [desc, setDesc] = useState(initialDescription ?? "");
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [due, setDue] = useState(initialDue ?? "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splits, setSplits] = useState<{ userId: string; share: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addSplit = (userId: string) => {
    if (splits.find((s) => s.userId === userId)) return;
    setSplits([...splits, { userId, share: "" }]);
  };

  const removeSplit = (userId: string) => {
    setSplits(splits.filter((s) => s.userId !== userId));
  };

  const updateSplitShare = (userId: string, share: string) => {
    setSplits(splits.map((s) => (s.userId === userId ? { ...s, share } : s)));
  };

  const handleSubmit = () => {
    const parsedSplits = splits
      .filter((s) => s.share)
      .map((s) => ({
        userId: s.userId,
        amountCents: Math.round(parseFloat(s.share.replace(/[$,]/g, "")) * 100),
      }));
    onSend({ description: desc, amount, due, recipientEmail, splits: parsedSplits });
  };

  return (
    <div className="border border-border rounded-lg p-4 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconInvoice size={14} />
          <span className="text-[13px] font-medium text-text-primary">Create Invoice</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5">
          <IconX size={14} />
        </button>
      </div>

      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="What is this invoice for?"
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none mb-2 focus:border-border-hover transition-colors"
      />

      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-7 pr-3 py-2 outline-none focus:border-border-hover transition-colors tabular-nums"
          />
        </div>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="flex-1 text-[13px] font-body text-text-primary bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
        />
      </div>

      {/* Advanced options toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer mb-2"
      >
        <span className={`transition-transform duration-150 ${showAdvanced ? "rotate-180" : ""}`}>
          <IconChevronDown size={10} />
        </span>
        Advanced options
      </button>

      {showAdvanced && (
        <div className="space-y-2 mb-3 animate-[slideDown_0.15s_ease-out]">
          {/* Recipient email */}
          <div>
            <label className="text-[11px] text-text-muted font-medium mb-1 block">Recipient email (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><IconMail size={12} /></span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-8 pr-3 py-2 outline-none focus:border-border-hover transition-colors"
              />
            </div>
          </div>

          {/* Split invoice */}
          <div>
            <button
              onClick={() => setShowSplit(!showSplit)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <IconSplit size={12} />
              Split invoice between team members
            </button>

            {showSplit && members.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {members.map((m) => {
                  const split = splits.find((s) => s.userId === m.userId);
                  return (
                    <div key={m.userId} className="flex items-center gap-2">
                      <span className="text-[12px] text-text-secondary truncate w-[100px]">{m.name}</span>
                      {split ? (
                        <>
                          <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">$</span>
                            <input
                              type="text"
                              value={split.share}
                              onChange={(e) => updateSplitShare(m.userId, e.target.value)}
                              placeholder="0.00"
                              className="w-full text-[12px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded px-2 pl-5 py-1 outline-none focus:border-border-hover transition-colors tabular-nums"
                            />
                          </div>
                          <button
                            onClick={() => removeSplit(m.userId)}
                            className="text-text-muted hover:text-negative cursor-pointer p-0.5"
                          >
                            <IconX size={10} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addSplit(m.userId)}
                          className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!desc.trim() || !amount.trim() || sending}
        className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <IconInvoice size={12} />
        {sending ? "Creating..." : "Send invoice"}
      </button>
    </div>
  );
}

function ProposalForm({ onSend, onCancel, sending }: { onSend: (scope: string, budget: string, timeline: string) => void; onCancel: () => void; sending: boolean }) {
  const [scope, setScope] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");

  return (
    <div className="border border-border rounded-lg p-4 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconProposal size={14} />
          <span className="text-[13px] font-medium text-text-primary">Create Proposal</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5">
          <IconX size={14} />
        </button>
      </div>
      <textarea
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        placeholder="Describe the scope of work..."
        rows={3}
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none resize-none mb-2 focus:border-border-hover transition-colors"
      />
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">$</span>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="5,000"
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-7 pr-3 py-2 outline-none focus:border-border-hover transition-colors"
          />
        </div>
        <input
          type="text"
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder="2 weeks"
          className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
        />
      </div>
      <button
        onClick={() => onSend(scope, budget, timeline)}
        disabled={!scope.trim() || sending}
        className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <IconProposal size={12} />
        {sending ? "Sending..." : "Send proposal"}
      </button>
    </div>
  );
}

function MilestoneForm({ onSend, onCancel, sending }: { onSend: (title: string, amount: string, description: string) => void; onCancel: () => void; sending: boolean }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="border border-border rounded-lg p-4 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconMilestone size={14} />
          <span className="text-[13px] font-medium text-text-primary">Add Milestone</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5">
          <IconX size={14} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone name (e.g. Design mockups)"
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none mb-2 focus:border-border-hover transition-colors"
      />
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Payment for this milestone"
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-7 pr-3 py-2 outline-none focus:border-border-hover transition-colors tabular-nums"
          />
        </div>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What needs to be delivered? (optional)"
        rows={2}
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none resize-none mb-3 focus:border-border-hover transition-colors"
      />
      <button
        onClick={() => onSend(title, amount, description)}
        disabled={!title.trim() || sending}
        className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <IconMilestone size={12} />
        {sending ? "Creating..." : "Create milestone"}
      </button>
    </div>
  );
}

function TaskForm({ onSend, onCancel, sending, members }: { onSend: (title: string, assigneeId: string) => void; onCancel: () => void; sending: boolean; members: ProjectMember[] }) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  return (
    <div className="border border-border rounded-lg p-4 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconTask size={14} />
          <span className="text-[13px] font-medium text-text-primary">Add Task</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5">
          <IconX size={14} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none mb-2 focus:border-border-hover transition-colors"
      />
      {members.length > 0 && (
        <div className="mb-3">
          <label className="text-[11px] text-text-muted font-medium mb-1.5 block">Assign to</label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.userId}
                onClick={() => setAssigneeId(assigneeId === m.userId ? "" : m.userId)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors cursor-pointer ${
                  assigneeId === m.userId
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-border text-text-secondary hover:border-border-hover"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => onSend(title, assigneeId)}
        disabled={!title.trim() || sending}
        className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <IconTask size={12} />
        {sending ? "Creating..." : "Create task"}
      </button>
    </div>
  );
}

function PaymentForm({
  onSend,
  onCancel,
  sending,
  members,
  currentUserId,
}: {
  onSend: (data: { recipientId: string; amountCents: number; description: string }) => void;
  onCancel: () => void;
  sending: boolean;
  members: ProjectMember[];
  currentUserId?: string;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const otherMembers = members.filter((m) => m.userId !== currentUserId);
  const [recipientId, setRecipientId] = useState(otherMembers[0]?.userId || "");

  const handleSubmit = () => {
    const rawAmount = amount.replace(/[$,]/g, "");
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0 || !recipientId) return;
    onSend({ recipientId, amountCents: Math.round(parsed * 100), description: description.trim() || "Direct payment" });
  };

  return (
    <div className="border border-border rounded-lg p-4 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconDollar size={14} />
          <span className="text-[13px] font-medium text-text-primary">Send Payment</span>
        </div>
        <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5">
          <IconX size={14} />
        </button>
      </div>

      {otherMembers.length > 1 && (
        <div className="mb-2">
          <label className="text-[11px] text-text-muted font-medium mb-1.5 block">Send to</label>
          <div className="flex flex-wrap gap-1.5">
            {otherMembers.map((m) => (
              <button
                key={m.userId}
                onClick={() => setRecipientId(m.userId)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors cursor-pointer ${
                  recipientId === m.userId
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-border text-text-secondary hover:border-border-hover"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-muted">$</span>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md pl-7 pr-3 py-2 outline-none focus:border-border-hover transition-colors tabular-nums"
        />
      </div>

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What is this payment for? (optional)"
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none mb-3 focus:border-border-hover transition-colors"
      />

      <button
        onClick={handleSubmit}
        disabled={!amount.trim() || !recipientId || sending}
        className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        <IconDollar size={12} />
        {sending ? "Processing..." : "Send payment"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ProjectChatProps {
  projectId: string;
  members?: ProjectMember[];
}

export default function ProjectChat({ projectId, members = [] }: ProjectChatProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [balance, setBalance] = useState<ProjectBalance | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [checkingInvoice, setCheckingInvoice] = useState<string | null>(null);
  // Conversation id for the SSE stream — populated from the X-Conversation-Id
  // header on the first /api/messages fetch. Once set, useConversationStream
  // pushes new messages in real time and we drop the 4s polling effectively
  // to a fallback (kept for safety against missed events).
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Slash-command prefills for the invoice form. `key` forces remount so a
  // second `/invoice` populates fresh values rather than merging with stale
  // local state inside the form.
  const [invoicePrefill, setInvoicePrefill] = useState<
    { key: number; description?: string; amount?: string; due?: string } | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);

  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name || "You";

  // Determine role from project membership
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isClient = currentMember?.role?.toLowerCase() === "client";

  // ---- Data fetching ----

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`);
      if (!res.ok) return;
      const headerConv = res.headers.get("X-Conversation-Id");
      if (headerConv) setConversationId((c) => c ?? headerConv);
      const data: ChatMessage[] = await res.json();
      setChatMessages(data);
    } catch {
      // Silent fail on poll
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/balance`);
      if (!res.ok) return;
      const data = await res.json();
      setBalance(data);
    } catch {
      // Silent fail
    }
  }, [projectId]);

  useEffect(() => {
    setChatMessages([]);
    setIsLoading(true);
    fetchMessages();
    fetchBalance();
  }, [fetchMessages, fetchBalance]);

  // Typing indicator — peer composes → SSE `typing` event → render. Local
  // composer fires throttled pings via `pingTyping()` invoked from onChange.
  const { pingTyping, typingPeer, onPeerTyping } = useTypingIndicator(conversationId);

  // Real-time push via SSE for any conversation we know about. The stream
  // fires `message` events from posts (this user's, peers', invoices) and
  // `invoice_status` events from the Whop webhook on payment / void / past
  // due. Both trigger a refetch — cheaper than tracking deltas, and the
  // /api/messages response is small enough that re-pulling is fine.
  useConversationStream(conversationId, {
    onMessage: () => {
      fetchMessages();
      fetchBalance();
    },
    onInvoiceStatus: () => {
      fetchMessages();
      fetchBalance();
    },
    onTyping: (e) => {
      // Ignore our own pings — server emits to all subscribers including us.
      if (e.userId === currentUserId) return;
      onPeerTyping(e);
    },
  });

  // Poll fallback. Tightens to 4s while SSE isn't yet bound (initial mount,
  // or environments without EventSource); relaxes to 30s once the stream
  // is live so we still self-heal from a missed/dropped frame without
  // hammering the API.
  useEffect(() => {
    const ms = conversationId ? 30_000 : POLL_INTERVAL;
    const interval = setInterval(() => {
      fetchMessages();
      fetchBalance();
    }, ms);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchBalance, conversationId]);

  // ---- Auto-scroll with scroll-awareness ----
  //
  // Two-pass behavior so opening a chat anchors at the bottom (where the
  // most recent message lives), and subsequent messages drip-feed in:
  //   - Initial load / project switch → instant snap (behaviour: 'auto').
  //   - Subsequent message arrivals → smooth scroll, but ONLY if the user
  //     is already near the bottom. If they scrolled up to read history,
  //     don't yank them down — let them finish reading.

  const initialLoadedRef = useRef(false);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!userScrolledRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior });
      });
    }
  }, []);

  // Reset anchor state when the project changes — fresh chat, fresh anchor.
  useEffect(() => {
    initialLoadedRef.current = false;
    userScrolledRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      scrollToBottom("auto");
    } else {
      scrollToBottom("smooth");
    }
  }, [chatMessages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledRef.current = distanceFromBottom > 80;
  }, []);

  // ---- Auto-resize textarea ----

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [inputValue]);

  // ---- Send message ----

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isSending) return;

    // Slash commands. Currently only `/invoice <amount> [for <description>]
    // [due <date>]` is supported. Parsing is intentionally forgiving — any
    // shape mismatch falls through to a normal message send.
    const slash = parseSlashCommand(text);
    if (slash?.kind === "invoice") {
      setInputValue("");
      setInvoicePrefill({
        key: Date.now(),
        amount: slash.amountDollars,
        description: slash.description,
        due: slash.due,
      });
      setActiveAction("invoice");
      return;
    }

    setIsSending(true);
    setInputValue("");

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      senderId: currentUserId || null,
      senderName: currentUserName,
      content: text,
      messageType: "text",
      fileUrl: null,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    userScrolledRef.current = false;
    textareaRef.current?.focus();

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content: text }),
      });

      if (!res.ok) {
        setChatMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setInputValue(text);
        setIsSending(false);
        return;
      }

      const created: ChatMessage = await res.json();
      setChatMessages((prev) => prev.map((m) => (m.id === optimisticId ? created : m)));
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
      setInputValue(text);
    }

    setIsSending(false);
  }

  // ---- Send structured message ----

  async function sendStructuredMessage(content: string) {
    if (isSending) return;
    setIsSending(true);

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      senderId: currentUserId || null,
      senderName: currentUserName,
      content,
      messageType: "text",
      fileUrl: null,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    userScrolledRef.current = false;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content }),
      });

      if (!res.ok) {
        setChatMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setIsSending(false);
        return;
      }

      const created: ChatMessage = await res.json();
      setChatMessages((prev) => prev.map((m) => (m.id === optimisticId ? created : m)));
    } catch {
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- Invoice handler ----

  async function handleSendInvoice(data: {
    description: string;
    amount: string;
    due: string;
    recipientEmail: string;
    splits: { userId: string; amountCents: number }[];
  }) {
    if (!data.description.trim() || !data.amount.trim() || isSending) return;

    const rawAmount = data.amount.replace(/[$,]/g, "");
    const parsed = parseFloat(rawAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast("Enter a valid amount");
      return;
    }
    const amountCents = Math.round(parsed * 100);

    setIsSending(true);
    try {
      // <input type="date"> emits YYYY-MM-DD; the API's Zod schema is
      // `.datetime()` which requires a full ISO-8601 timestamp. Pad to end
      // of day in the user's local TZ so "due Apr 30" doesn't read as
      // midnight UTC the day before.
      const dueIso = data.due
        ? new Date(`${data.due}T23:59:59`).toISOString()
        : undefined;
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          description: data.description.trim(),
          amount: amountCents,
          dueDate: dueIso,
          recipientEmail: data.recipientEmail || undefined,
          splits: data.splits.length > 0 ? data.splits : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create invoice" }));
        toast(err.error || "Failed to send invoice");
        setIsSending(false);
        return;
      }

      toast("Invoice created");
      userScrolledRef.current = false;
      await fetchMessages();
      await fetchBalance();
    } catch {
      toast("Failed to send invoice");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- Check invoice status ----

  async function handleCheckInvoiceStatus(invoiceId: string) {
    setCheckingInvoice(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/check-status`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.statusChanged) {
          toast(`Invoice status updated to ${data.status}`);
          await fetchMessages();
          await fetchBalance();
        } else {
          toast(`Status: ${data.status}`);
        }
      }
    } catch {
      toast("Could not check invoice status");
    }
    setCheckingInvoice(null);
  }

  // ---- Send invoice email ----

  async function handleSendInvoiceEmail(invoiceId: string) {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast("Invoice email sent");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to send email");
      }
    } catch {
      toast("Failed to send email");
    }
  }

  // ---- Proposal handler ----

  function handleSendProposal(scope: string, budget: string, timeline: string) {
    if (!scope.trim()) return;
    const content = `PROPOSAL\nScope: ${scope.trim()}\nBudget: ${budget.trim() ? `$${budget.trim().replace(/^\$/, "")}` : "TBD"}\nTimeline: ${timeline.trim() || "TBD"}`;
    sendStructuredMessage(content);
  }

  // ---- Milestone handler ----

  async function handleCreateMilestone(title: string, amount: string, description: string) {
    if (!title.trim()) return;

    const amountStr = amount.trim() ? `$${amount.trim().replace(/^\$/, "").replace(/,/g, "")}` : "";
    let content = `MILESTONE\nTitle: ${title.trim()}`;
    if (amountStr) content += `\nAmount: ${amountStr}`;
    if (description.trim()) content += `\nDescription: ${description.trim()}`;
    content += `\nStatus: In Progress`;

    // Also create a task for this milestone
    try {
      await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Milestone: ${title.trim()}` }),
      });
    } catch {
      // Non-blocking
    }

    // If amount specified, also create an invoice
    if (amount.trim()) {
      const rawAmount = amount.replace(/[$,]/g, "");
      const parsed = parseFloat(rawAmount);
      if (!isNaN(parsed) && parsed > 0) {
        try {
          await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              description: `Milestone: ${title.trim()}`,
              amount: Math.round(parsed * 100),
            }),
          });
          await fetchBalance();
        } catch {
          // Non-blocking
        }
      }
    }

    sendStructuredMessage(content);
  }

  // ---- Task handler ----

  async function handleCreateTask(title: string, assigneeId: string) {
    if (!title.trim() || isSending) return;
    setIsSending(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assignedTo: assigneeId || undefined,
        }),
      });

      if (!res.ok) {
        toast("Failed to create task");
        setIsSending(false);
        return;
      }

      const assigneeName = assigneeId
        ? members.find((m) => m.userId === assigneeId)?.name || "someone"
        : "";
      const content = assigneeName
        ? `TASK CREATED\n"${title.trim()}" assigned to ${assigneeName}`
        : `TASK CREATED\n"${title.trim()}"`;

      // Post a system message about the task
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          content,
          messageType: "system",
        }),
      });

      toast("Task created");
      userScrolledRef.current = false;
      await fetchMessages();
    } catch {
      toast("Failed to create task");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- Accept proposal ----

  function handleAcceptProposal() {
    sendStructuredMessage("TERMS ACCEPTED -- Looking forward to working together. Let's get started.");
  }

  // ---- Direct payment handler ----

  async function handleSendPayment(data: { recipientId: string; amountCents: number; description: string }) {
    if (isSending) return;
    setIsSending(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: data.recipientId,
          projectId,
          amountCents: data.amountCents,
          description: data.description,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Payment failed");
        setIsSending(false);
        return;
      }

      const result = await res.json();
      toast("Payment link created");
      userScrolledRef.current = false;
      await fetchMessages();
      await fetchBalance();
    } catch {
      toast("Payment failed");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- File handler ----

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      toast("Uploading...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "asset");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        toast("Upload failed");
        return;
      }

      const { url } = await uploadRes.json();

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          content: file.name,
          messageType: "file",
          fileUrl: url,
        }),
      });

      if (!res.ok) {
        toast("Failed to send file");
        return;
      }

      const created: ChatMessage = await res.json();
      setChatMessages((prev) => [...prev, created]);
      userScrolledRef.current = false;
      toast("File shared");
    } catch {
      toast("Upload failed");
    }
    setActiveAction(null);
  }

  // ---- Key handling ----

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ---- Quick action definitions (role-gated) ----

  const allActions: { key: ActiveAction; icon: React.ReactNode; label: string; roles: ("client" | "creator" | "both")[]; immediate?: boolean }[] = [
    { key: "invoice", icon: <IconInvoice size={13} />, label: "Invoice", roles: ["creator"] },
    { key: "proposal", icon: <IconProposal size={13} />, label: "Proposal", roles: ["creator"] },
    { key: "milestone", icon: <IconMilestone size={13} />, label: "Milestone", roles: ["creator"] },
    { key: "task", icon: <IconTask size={13} />, label: "Task", roles: ["both"] },
    // Direct payment — open to both sides. A client paying a creator is the
    // common case; a creator paying a collaborator (e.g. splitting fees) is
    // valid too. The form's recipient picker filters out the sender.
    { key: "payment", icon: <IconDollar size={13} />, label: "Payment", roles: ["both"] },
    { key: "files", icon: <IconPaperclip size={13} />, label: "Files", roles: ["both"], immediate: true },
  ];

  const actions = allActions.filter((a) =>
    a.roles.includes("both") || a.roles.includes(isClient ? "client" : "creator")
  );

  const charCount = inputValue.length;

  // ---- Parse milestone from content ----
  function parseMilestone(content: string): { title: string; amount?: string; status: string } | null {
    if (!content.includes("MILESTONE")) return null;
    const lines = content.split("\n");
    let title = "";
    let amount: string | undefined;
    let status = "In Progress";
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith("Title:")) title = t.slice(6).trim();
      else if (t.startsWith("Amount:")) amount = t.slice(7).trim();
      else if (t.startsWith("Status:")) status = t.slice(7).trim();
    }
    return title ? { title, amount, status } : null;
  }

  // ---- Render ----

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Balance bar -- compact inline */}
      {balance && balance.totalInvoiced > 0 && (
        <BalanceBar balance={balance} />
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {isLoading && <LoadingSkeleton />}

        {!isLoading && chatMessages.length === 0 && <EmptyState />}

        {!isLoading && chatMessages.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {chatMessages.map((msg, idx) => {
              const prev = idx > 0 ? chatMessages[idx - 1] : null;
              // Day divider — render a thin centered date line whenever the
              // calendar day changes between consecutive messages. "Today"
              // and "Yesterday" labels for the recent two; full date past that.
              const showDayDivider = !prev || !sameLocalDay(prev.createdAt, msg.createdAt);
              const isStructured =
                msg.content?.includes("INVOICE") ||
                msg.content?.includes("PROPOSAL") ||
                msg.content?.includes("MILESTONE") ||
                msg.content?.includes("TASK CREATED") ||
                msg.content?.includes("TERMS ACCEPTED") ||
                msg.content?.includes("DIRECT PAYMENT") ||
                msg.content?.includes("PAYMENT RECEIVED");
              const prevIsStructured =
                prev?.content?.includes("INVOICE") ||
                prev?.content?.includes("PROPOSAL") ||
                prev?.content?.includes("MILESTONE") ||
                prev?.content?.includes("TASK CREATED") ||
                prev?.content?.includes("TERMS ACCEPTED") ||
                prev?.content?.includes("DIRECT PAYMENT") ||
                prev?.content?.includes("PAYMENT RECEIVED");

              const isSameGroup =
                prev &&
                prev.messageType !== "system" &&
                msg.messageType !== "system" &&
                prev.senderId === msg.senderId &&
                !prevIsStructured &&
                !isStructured;

              // Helper: every render branch wraps its output in a Fragment
              // keyed by msg.id so the optional day divider sits inline at
              // the top of each "first-of-day" message.
              const withDivider = (node: React.ReactNode) => (
                <Fragment key={msg.id}>
                  {showDayDivider && (
                    <div className="flex items-center gap-3 my-3 px-4 select-none">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                        {dayDividerLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  {node}
                </Fragment>
              );

              // System messages (non-structured)
              if (msg.messageType === "system" && !isStructured) {
                return withDivider(<SystemMessage content={msg.content} />);
              }

              // Structured invoice message (the new path — Phase 1 made
              // every invoice an FK message). When the API hydrates
              // `msg.invoice`, render directly from those fields. Skips
              // the legacy regex parser entirely — paid/voided/past_due
              // status flips arrive via SSE and re-render via state.
              if (msg.messageType === "invoice" && msg.invoice) {
                const inv = msg.invoice;
                const isMine = inv.senderId === currentUserId;
                const senderMember = members.find((m) => m.userId === inv.senderId);
                const recipientMember = members.find((m) => m.userId === inv.recipientId);
                const structuredInvoice: ParsedInvoice = {
                  description: inv.description,
                  amount: (inv.amountCents / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                  due: inv.dueDate
                    ? new Date(inv.dueDate).toLocaleDateString()
                    : null,
                  status: inv.status,
                  invoiceId: inv.id,
                  payUrl: inv.paymentUrl,
                  from: senderMember?.name || null,
                  to: recipientMember?.name || null,
                };
                return withDivider((
                  <div
                    key={msg.id}
                    className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <InvoiceCard
                      invoice={structuredInvoice}
                      currentUserName={currentUserName}
                      isSender={isMine}
                      onCheckStatus={handleCheckInvoiceStatus}
                      onSendEmail={handleSendInvoiceEmail}
                      checking={checkingInvoice === inv.id}
                    />
                  </div>
                ));
              }

              // Legacy: text-parsed invoice message (pre-Phase 1).
              const invoice = parseInvoiceContent(msg.content);
              if (invoice) {
                // Determine if current user is the invoice sender using From/To fields
                // matched against all known member names, with senderId as fallback.
                const fieldMatchesMe = (field: string | null): boolean => {
                  if (!field) return false;
                  const lower = field.toLowerCase();
                  if (currentUserName && lower === currentUserName.toLowerCase()) return true;
                  const matched = members.find((m) => m.name.toLowerCase() === lower);
                  return matched?.userId === currentUserId;
                };

                // Priority: From/To fields are most reliable (survive status update messages
                // where senderId may be null). Fall back to senderId for legacy messages.
                let invoiceSentByMe: boolean;
                if (invoice.from || invoice.to) {
                  invoiceSentByMe = fieldMatchesMe(invoice.from) || (!!invoice.to && !fieldMatchesMe(invoice.to));
                } else {
                  invoiceSentByMe = msg.senderId === currentUserId;
                }
                return withDivider((
                  <div key={msg.id} className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${invoiceSentByMe ? "justify-end" : "justify-start"}`}>
                    <InvoiceCard
                      invoice={invoice}
                      currentUserName={currentUserName}
                      isSender={invoiceSentByMe}
                      onCheckStatus={handleCheckInvoiceStatus}
                      onSendEmail={handleSendInvoiceEmail}
                      checking={checkingInvoice === invoice.invoiceId}
                    />
                  </div>
                ));
              }

              // Proposal message
              const proposal = parseProposalContent(msg.content);
              if (proposal) {
                const isOwn = msg.senderId === currentUserId;
                return withDivider((
                  <div key={msg.id} className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${isOwn ? "justify-end" : "justify-start"}`}>
                    <ProposalCard proposal={proposal} onAccept={!isOwn ? handleAcceptProposal : undefined} isOwn={isOwn} senderName={msg.senderName} />
                  </div>
                ));
              }

              // Milestone message
              const milestone = parseMilestone(msg.content);
              if (milestone) {
                return withDivider((
                  <div key={msg.id} className="flex justify-center py-2 animate-[fadeInUp_0.25s_ease-out]">
                    <MilestoneCard title={milestone.title} amount={milestone.amount} status={milestone.status} />
                  </div>
                ));
              }

              // Direct payment / payment received message
              if (msg.content?.includes("DIRECT PAYMENT") || msg.content?.includes("PAYMENT RECEIVED")) {
                // PAYMENT RECEIVED without Amount: field is a status update -> system message
                if (msg.content?.includes("PAYMENT RECEIVED") && !msg.content?.includes("Amount:")) {
                  return <SystemMessage key={msg.id} content={msg.content.split("\n")[0]} />;
                }
                const lines = msg.content.split("\n");
                const isPaid = msg.content.includes("PAYMENT RECEIVED") || msg.content.includes("Status: Completed");
                let payAmount = "";
                let payDesc = "";
                let payUrl = "";
                let payTxId = "";
                let payFrom = "";
                let payTo = "";
                for (const line of lines) {
                  const t = line.trim();
                  if (t.startsWith("Amount:")) payAmount = t.slice(7).trim();
                  else if (t.startsWith("Description:")) payDesc = t.slice(12).trim();
                  else if (t.startsWith("Pay:")) payUrl = t.slice(4).trim();
                  else if (t.startsWith("Transaction ID:")) payTxId = t.slice(15).trim();
                  else if (t.startsWith("From:")) payFrom = t.slice(5).trim();
                  else if (t.startsWith("To:")) payTo = t.slice(3).trim();
                }
                // Determine perspective using From/To name matching against members
                const payFieldMatchesMe = (field: string): boolean => {
                  if (!field) return false;
                  const lower = field.toLowerCase();
                  if (currentUserName && lower === currentUserName.toLowerCase()) return true;
                  const matched = members.find((m) => m.name.toLowerCase() === lower);
                  return matched?.userId === currentUserId;
                };

                let paySentByMe: boolean;
                if (payFrom || payTo) {
                  paySentByMe = payFieldMatchesMe(payFrom) || (!!payTo && !payFieldMatchesMe(payTo));
                } else {
                  paySentByMe = msg.senderId === currentUserId;
                }
                const payContextLine = paySentByMe
                  ? `You sent this${payTo ? ` to ${payTo}` : ""}`
                  : `${payFrom || "Someone"} sent you a payment`;

                return withDivider((
                  <div key={msg.id} className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${paySentByMe ? "justify-end" : "justify-start"}`}>
                    <div className={`bg-surface-muted rounded-lg overflow-hidden max-w-[calc(100vw-48px)] sm:max-w-[340px] w-full ${isPaid ? "ring-1 ring-positive/20" : ""}`}>
                      <div className={`px-3 py-2 flex items-center justify-between ${isPaid ? "bg-positive/5" : ""}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary"><IconDollar size={14} /></span>
                          <span className="text-[13px] font-medium text-text-primary">Payment</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-[6px] h-[6px] rounded-full ${isPaid ? "bg-positive" : "bg-warning"}`} />
                          <span className={`text-[11px] font-medium ${isPaid ? "text-positive" : "text-warning"}`}>
                            {isPaid ? "Completed" : "Pending"}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-t border-border/50">
                        <p className="text-[11px] text-text-muted">{payContextLine}</p>
                      </div>
                      <div className="px-3 py-2 border-t border-border/50">
                        {payDesc && <p className="text-[13px] text-text-secondary leading-snug mb-2">{payDesc}</p>}
                        {payAmount && <p className="text-[20px] font-semibold text-text-primary tabular-nums tracking-tight">{payAmount}</p>}
                      </div>
                      {!isPaid && (
                        <div className="px-3 py-2 border-t border-border flex items-center gap-2">
                          {!paySentByMe && payUrl && (
                            <a href={payUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors no-underline">
                              <IconWallet size={12} />
                              Pay now
                            </a>
                          )}
                          {payTxId && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/payments/${payTxId}/check-status`, { method: "POST" });
                                  if (res.ok) {
                                    const data = await res.json();
                                    if (data.changed) {
                                      toast("Payment confirmed");
                                      await fetchMessages();
                                      await fetchBalance();
                                    } else {
                                      toast(`Status: ${data.status}`);
                                    }
                                  }
                                } catch {
                                  toast("Could not check status");
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer"
                            >
                              <IconRefresh size={11} />
                              Verify payment
                            </button>
                          )}
                        </div>
                      )}
                      {isPaid && (
                        <div className="px-3 py-2 border-t border-positive/10 bg-positive/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-positive"><IconCheck size={12} /></span>
                            <span className="text-[11px] font-medium text-positive">
                              {paySentByMe ? "Payment complete" : "Payment received -- credited to your balance"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              }

              // Terms accepted message
              if (msg.content?.includes("TERMS ACCEPTED")) {
                return withDivider((
                  <div key={msg.id} className="flex justify-center py-3 animate-[fadeInUp_0.25s_ease-out]">
                    <div className="flex items-center gap-2 px-4 py-2 bg-positive/5 rounded-full border border-positive/20">
                      <span className="text-positive"><IconCheck size={14} /></span>
                      <span className="text-[13px] font-medium text-positive">Terms accepted</span>
                      <span className="text-[11px] text-text-muted ml-1">by {msg.senderId === currentUserId ? "you" : msg.senderName}</span>
                    </div>
                  </div>
                ));
              }

              // Task created message
              if (msg.content?.includes("TASK CREATED") && msg.messageType === "system") {
                const taskContent = msg.content.replace("TASK CREATED\n", "").replace("TASK CREATED", "");
                return withDivider((
                  <div key={msg.id} className="flex items-center gap-3 py-3 animate-[fadeInUp_0.2s_ease-out]">
                    <div className="flex-1 h-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted"><IconTask size={12} /></span>
                      <span className="text-[12px] text-text-muted font-body">{taskContent}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                ));
              }

              const isOwn = msg.senderId === currentUserId;
              const showMeta = !isSameGroup;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col animate-[fadeInUp_0.2s_ease-out] ${isOwn ? "items-end" : "items-start"} ${showMeta ? "mt-3" : "mt-0.5"}`}
                >
                  {showMeta && (
                    <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-[12px] text-text-muted font-medium">{isOwn ? "You" : msg.senderName || "Unknown"}</span>
                      <span className="text-[11px] font-mono text-text-muted">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}

                  {msg.messageType === "file" ? (
                    <FileCard content={msg.content} fileUrl={msg.fileUrl} />
                  ) : (
                    <div
                      className={`
                        max-w-[70%] px-3 py-1.5 text-[13px] font-body leading-snug whitespace-pre-wrap break-words
                        ${isOwn
                          ? "bg-[#171717] text-white rounded-[16px] rounded-br-[4px]"
                          : "bg-surface-muted text-text-primary rounded-[16px] rounded-bl-[4px]"
                        }
                      `}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator — sits just above the composer so you don't lose
          your place in the feed. Auto-clears 5s after the last `typing` SSE
          event from the peer (via useTypingIndicator). */}
      {typingPeer && (
        <div className="px-4 py-1 text-[11px] text-text-muted animate-[fadeInUp_0.18s_ease-out]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex gap-0.5">
              <span
                className="w-1 h-1 rounded-full bg-text-muted"
                style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "0s" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-text-muted"
                style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "0.15s" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-text-muted"
                style={{ animation: "typingDot 1.2s ease-in-out infinite", animationDelay: "0.3s" }}
              />
            </span>
            {typingPeer.name || "Someone"} is typing…
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Inline forms */}
      {activeAction === "invoice" && (
        <InvoiceForm
          key={invoicePrefill?.key ?? "default"}
          onSend={handleSendInvoice}
          onCancel={() => {
            setActiveAction(null);
            setInvoicePrefill(null);
          }}
          sending={isSending}
          members={members}
          initialDescription={invoicePrefill?.description}
          initialAmount={invoicePrefill?.amount}
          initialDue={invoicePrefill?.due}
        />
      )}
      {activeAction === "proposal" && (
        <ProposalForm
          onSend={handleSendProposal}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
        />
      )}
      {activeAction === "milestone" && (
        <MilestoneForm
          onSend={handleCreateMilestone}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
        />
      )}
      {activeAction === "task" && (
        <TaskForm
          onSend={handleCreateTask}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
          members={members}
        />
      )}
      {activeAction === "payment" && (
        <PaymentForm
          onSend={handleSendPayment}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
          members={members}
          currentUserId={currentUserId}
        />
      )}

      {/* Combined input + actions */}
      <div className="border-t border-border bg-background">
        {/* Quick actions */}
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-0.5 overflow-x-auto scrollbar-none">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => {
                if (action.key === "files") {
                  fileInputRef.current?.click();
                } else {
                  setActiveAction(activeAction === action.key ? null : action.key);
                }
              }}
              className={`
                flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all whitespace-nowrap cursor-pointer flex-shrink-0
                ${activeAction === action.key
                  ? "text-text-primary bg-surface-muted"
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-muted/50"
                }
              `}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 pb-2 pt-0.5">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInputValue(e.target.value);
                pingTyping();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…  ·  /invoice 250 for site copy"
            rows={1}
            className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none resize-none leading-relaxed max-h-[100px]"
            style={{ minHeight: "22px" }}
          />
          {charCount >= CHAR_WARN_THRESHOLD && (
            <span className={`text-[10px] font-mono flex-shrink-0 tabular-nums pb-0.5 ${charCount > MAX_CHARS * 0.95 ? "text-negative" : "text-text-muted"}`}>
              {charCount}/{MAX_CHARS}
            </span>
          )}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className={`
              flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer
              ${inputValue.trim()
                ? "bg-[#171717] text-white hover:bg-[#0a0a0a]"
                : "bg-surface-muted text-text-muted cursor-not-allowed"
              }
            `}
            aria-label="Send message"
          >
            <IconSend size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
