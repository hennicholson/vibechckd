"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "../Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageType = "text" | "file" | "system" | "ai";
type ActiveAction = "invoice" | "proposal" | "milestone" | "files" | "task" | "payment" | null;

interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: MessageType;
  fileUrl: string | null;
  createdAt: string;
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

function parseInvoiceContent(content: string): ParsedInvoice | null {
  if (!content.includes("INVOICE")) return null;
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

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("Description:")) description = t.slice(12).trim();
    else if (t.startsWith("Amount:")) amount = t.slice(7).trim();
    else if (t.startsWith("Due:")) due = t.slice(4).trim();
    else if (t.startsWith("Status:")) {
      const s = t.slice(7).trim();
      if (s) status = s;
    } else if (t.startsWith("Invoice ID:") || t.startsWith("Invoice ")) {
      const m = t.match(/Invoice(?:\s+ID)?:?\s+(.+)/);
      if (m) invoiceId = m[1].trim();
    } else if (t.startsWith("Pay:")) payUrl = t.slice(4).trim();
  }

  return { description, amount, due, status, invoiceId, payUrl };
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

// --- Invoice Card ---

function InvoiceCard({
  invoice,
  currentUserId,
  onCheckStatus,
  onSendEmail,
  checking,
}: {
  invoice: ParsedInvoice;
  currentUserId?: string;
  onCheckStatus?: (invoiceId: string) => void;
  onSendEmail?: (invoiceId: string) => void;
  checking?: boolean;
}) {
  const dotColor = statusColor(invoice.status);
  const label = statusLabel(invoice.status);
  const isPaid = invoice.status.toLowerCase() === "paid";
  const isVoided = invoice.status.toLowerCase() === "voided";

  return (
    <div className={`bg-surface-muted rounded-lg overflow-hidden max-w-[380px] w-full ${isPaid ? "ring-1 ring-positive/20" : ""}`}>
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${isPaid ? "bg-positive/5" : "bg-surface-muted"}`}>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary"><IconInvoice size={14} /></span>
          <span className="text-[13px] font-medium text-text-primary">Invoice</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[11px] font-medium" style={{ color: dotColor }}>{label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {invoice.description && (
          <p className="text-[13px] text-text-secondary leading-snug mb-2">{invoice.description}</p>
        )}

        <div className="flex items-baseline justify-between mb-1">
          {invoice.amount && (
            <p className="text-[22px] font-semibold text-text-primary tabular-nums tracking-tight">{invoice.amount}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
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
        <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
          {invoice.payUrl && (
            <a
              href={invoice.payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors no-underline"
            >
              <IconWallet size={12} />
              Pay now
            </a>
          )}
          {invoice.invoiceId && onCheckStatus && (
            <button
              onClick={() => onCheckStatus(invoice.invoiceId!)}
              disabled={checking}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
            >
              <IconRefresh size={11} />
              {checking ? "Checking..." : "Check status"}
            </button>
          )}
          {invoice.invoiceId && onSendEmail && (
            <button
              onClick={() => onSendEmail(invoice.invoiceId!)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors cursor-pointer"
            >
              <IconMail size={11} />
              Email
            </button>
          )}
        </div>
      )}

      {isPaid && (
        <div className="px-4 py-2 border-t border-positive/10 bg-positive/5">
          <div className="flex items-center gap-1.5">
            <IconCheck size={12} />
            <span className="text-[11px] font-medium text-positive">Payment received</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Proposal Card ---

function ProposalCard({ proposal, onAccept, isOwn }: { proposal: ParsedProposal; onAccept?: () => void; isOwn: boolean }) {
  return (
    <div className="bg-surface-muted rounded-lg overflow-hidden max-w-[380px] w-full">
      <div className="px-4 py-2.5 flex items-center gap-2">
        <span className="text-text-secondary"><IconProposal size={14} /></span>
        <span className="text-[13px] font-medium text-text-primary">Project Proposal</span>
      </div>

      <div className="px-4 py-3 border-t border-border">
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
        <div className="px-4 py-2.5 border-t border-border">
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="block no-underline max-w-[280px] w-full">
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
    <div className="bg-surface-muted rounded-lg overflow-hidden max-w-[380px] w-full">
      <div className="px-4 py-2.5 flex items-center gap-2">
        <span className="text-text-secondary"><IconMilestone size={14} /></span>
        <span className="text-[13px] font-medium text-text-primary">Milestone</span>
      </div>
      <div className="px-4 py-3 border-t border-border">
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

function BalanceBar({ balance, onToggle, expanded }: { balance: ProjectBalance; onToggle: () => void; expanded: boolean }) {
  const paid = balance.totalPaid;
  const total = balance.totalInvoiced;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="border-b border-border bg-background">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-surface-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconWallet size={14} />
          <span className="text-[12px] font-medium text-text-primary">Project Balance</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-text-primary tabular-nums">{formatCurrency(paid)}</span>
          <span className="text-[11px] text-text-muted">/ {formatCurrency(total)}</span>
          <span className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <IconChevronDown size={12} />
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 animate-[slideDown_0.15s_ease-out]">
          {/* Progress bar */}
          <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-positive rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Paid</span>
              <p className="text-[14px] font-semibold text-positive tabular-nums mt-0.5">{formatCurrency(balance.totalPaid)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Pending</span>
              <p className="text-[14px] font-semibold text-warning tabular-nums mt-0.5">{formatCurrency(balance.totalPending)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-medium">Overdue</span>
              <p className="text-[14px] font-semibold text-negative tabular-nums mt-0.5">{formatCurrency(balance.totalOverdue)}</p>
            </div>
          </div>
        </div>
      )}
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
}) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);

  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name || "You";

  // ---- Data fetching ----

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`);
      if (!res.ok) return;
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

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      fetchBalance();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchBalance]);

  // ---- Auto-scroll with scroll-awareness ----

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
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
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          description: data.description.trim(),
          amount: amountCents,
          dueDate: data.due || undefined,
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

  // ---- Quick action definitions ----

  const actions: { key: ActiveAction; icon: React.ReactNode; label: string; immediate?: boolean }[] = [
    { key: "invoice", icon: <IconInvoice size={13} />, label: "Invoice" },
    { key: "proposal", icon: <IconProposal size={13} />, label: "Proposal" },
    { key: "milestone", icon: <IconMilestone size={13} />, label: "Milestone" },
    { key: "task", icon: <IconTask size={13} />, label: "Task" },
    { key: "payment", icon: <IconDollar size={13} />, label: "Payment" },
    { key: "files", icon: <IconPaperclip size={13} />, label: "Files", immediate: true },
  ];

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
      {/* Balance bar */}
      {balance && balance.totalInvoiced > 0 && (
        <BalanceBar
          balance={balance}
          expanded={showBalance}
          onToggle={() => setShowBalance(!showBalance)}
        />
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {isLoading && <LoadingSkeleton />}

        {!isLoading && chatMessages.length === 0 && <EmptyState />}

        {!isLoading && chatMessages.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {chatMessages.map((msg, idx) => {
              const prev = idx > 0 ? chatMessages[idx - 1] : null;
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

              // System messages (non-structured)
              if (msg.messageType === "system" && !isStructured) {
                return <SystemMessage key={msg.id} content={msg.content} />;
              }

              // Invoice message
              const invoice = parseInvoiceContent(msg.content);
              if (invoice) {
                return (
                  <div key={msg.id} className="flex justify-center py-2 animate-[fadeInUp_0.25s_ease-out]">
                    <InvoiceCard
                      invoice={invoice}
                      currentUserId={currentUserId}
                      onCheckStatus={handleCheckInvoiceStatus}
                      onSendEmail={handleSendInvoiceEmail}
                      checking={checkingInvoice === invoice.invoiceId}
                    />
                  </div>
                );
              }

              // Proposal message
              const proposal = parseProposalContent(msg.content);
              if (proposal) {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${isOwn ? "justify-end" : "justify-start"}`}>
                    <ProposalCard proposal={proposal} onAccept={!isOwn ? handleAcceptProposal : undefined} isOwn={isOwn} />
                  </div>
                );
              }

              // Milestone message
              const milestone = parseMilestone(msg.content);
              if (milestone) {
                return (
                  <div key={msg.id} className="flex justify-center py-2 animate-[fadeInUp_0.25s_ease-out]">
                    <MilestoneCard title={milestone.title} amount={milestone.amount} status={milestone.status} />
                  </div>
                );
              }

              // Direct payment / payment received message
              if (msg.content?.includes("DIRECT PAYMENT") || msg.content?.includes("PAYMENT RECEIVED")) {
                const lines = msg.content.split("\n");
                const isPaid = msg.content.includes("PAYMENT RECEIVED") || msg.content.includes("Status: Completed");
                let payAmount = "";
                let payDesc = "";
                let payUrl = "";
                let payTxId = "";
                for (const line of lines) {
                  const t = line.trim();
                  if (t.startsWith("Amount:")) payAmount = t.slice(7).trim();
                  else if (t.startsWith("Description:")) payDesc = t.slice(12).trim();
                  else if (t.startsWith("Pay:")) payUrl = t.slice(4).trim();
                  else if (t.startsWith("Transaction ID:")) payTxId = t.slice(15).trim();
                }
                return (
                  <div key={msg.id} className="flex justify-center py-2 animate-[fadeInUp_0.25s_ease-out]">
                    <div className={`bg-surface-muted rounded-lg overflow-hidden max-w-[380px] w-full ${isPaid ? "ring-1 ring-positive/20" : ""}`}>
                      <div className={`px-4 py-2.5 flex items-center justify-between ${isPaid ? "bg-positive/5" : ""}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary"><IconDollar size={14} /></span>
                          <span className="text-[13px] font-medium text-text-primary">{isPaid ? "Payment received" : "Payment"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-[6px] h-[6px] rounded-full ${isPaid ? "bg-positive" : "bg-warning"}`} />
                          <span className={`text-[11px] font-medium ${isPaid ? "text-positive" : "text-warning"}`}>
                            {isPaid ? "Completed" : "Pending"}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        {payDesc && <p className="text-[13px] text-text-secondary leading-snug mb-2">{payDesc}</p>}
                        {payAmount && <p className="text-[22px] font-semibold text-text-primary tabular-nums tracking-tight">{payAmount}</p>}
                      </div>
                      {!isPaid && (
                        <div className="px-4 py-2.5 border-t border-border flex items-center gap-2">
                          {payUrl && (
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
                              Check status
                            </button>
                          )}
                        </div>
                      )}
                      {isPaid && (
                        <div className="px-4 py-2 border-t border-positive/10 bg-positive/5">
                          <div className="flex items-center gap-1.5">
                            <IconCheck size={12} />
                            <span className="text-[11px] font-medium text-positive">Payment complete</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Terms accepted message
              if (msg.content?.includes("TERMS ACCEPTED")) {
                return (
                  <div key={msg.id} className="flex justify-center py-3 animate-[fadeInUp_0.25s_ease-out]">
                    <div className="flex items-center gap-2 px-4 py-2 bg-positive/5 rounded-full border border-positive/20">
                      <span className="text-positive"><IconCheck size={14} /></span>
                      <span className="text-[13px] font-medium text-positive">Terms accepted</span>
                      <span className="text-[11px] text-text-muted ml-1">by {msg.senderId === currentUserId ? "you" : msg.senderName}</span>
                    </div>
                  </div>
                );
              }

              // Task created message
              if (msg.content?.includes("TASK CREATED") && msg.messageType === "system") {
                const taskContent = msg.content.replace("TASK CREATED\n", "").replace("TASK CREATED", "");
                return (
                  <div key={msg.id} className="flex items-center gap-3 py-3 animate-[fadeInUp_0.2s_ease-out]">
                    <div className="flex-1 h-px bg-border" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-muted"><IconTask size={12} /></span>
                      <span className="text-[12px] text-text-muted font-body">{taskContent}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                );
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
                        max-w-[75%] px-3.5 py-2 text-[14px] font-body leading-relaxed whitespace-pre-wrap break-words
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
          onSend={handleSendInvoice}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
          members={members}
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

      {/* Quick actions bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border overflow-x-auto">
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
              flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer flex-shrink-0
              ${activeAction === action.key
                ? "border-[#171717] text-text-primary bg-surface-muted"
                : "text-text-muted border-border hover:border-border-hover hover:text-text-secondary"
              }
            `}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-3 py-2.5 bg-background">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 text-[14px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none resize-none leading-relaxed max-h-[120px]"
            style={{ minHeight: "24px" }}
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
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer
              ${inputValue.trim()
                ? "bg-[#171717] text-white hover:bg-[#0a0a0a]"
                : "bg-surface-muted text-text-muted cursor-not-allowed"
              }
            `}
            aria-label="Send message"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}
