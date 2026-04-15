"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "../Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageType = "text" | "file" | "system" | "ai";
type ActiveAction = "invoice" | "proposal" | "files" | "accept" | null;

interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: MessageType;
  fileUrl: string | null;
  createdAt: string;
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CHARS = 500;
const CHAR_WARN_THRESHOLD = 400;
const POLL_INTERVAL = 5000;

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
  if (s === "overdue" || s === "past due") return "#ef4444";
  if (s === "voided" || s === "draft") return "#a3a3a3";
  return "#a3a3a3";
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, no deps)
// ---------------------------------------------------------------------------

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MessageCircleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1 py-6 animate-pulse">
      {/* Left-aligned skeleton */}
      <div className="flex gap-2 max-w-[65%]">
        <div className="w-[200px] h-[36px] rounded-[16px] rounded-bl-[4px] bg-surface-muted" />
      </div>
      {/* Right-aligned skeleton */}
      <div className="flex gap-2 max-w-[55%] self-end">
        <div className="w-[160px] h-[36px] rounded-[16px] rounded-br-[4px] bg-surface-muted" />
      </div>
      {/* Left-aligned skeleton */}
      <div className="flex gap-2 max-w-[70%]">
        <div className="w-[240px] h-[36px] rounded-[16px] rounded-bl-[4px] bg-surface-muted" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
      <MessageCircleIcon />
      <div className="text-center">
        <p className="text-[14px] font-medium text-text-primary">Start the conversation</p>
        <p className="text-[13px] text-text-muted mt-0.5">Send a message to get started</p>
      </div>
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[12px] text-text-muted italic font-body whitespace-nowrap px-1">{content}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: ParsedInvoice }) {
  const dotColor = statusColor(invoice.status);
  return (
    <div className="border-l-4 border-l-[#171717] bg-surface-muted rounded-lg p-4 max-w-[340px] w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[14px]">&#128176;</span>
        <span className="text-[14px] font-medium text-text-primary">Invoice</span>
      </div>
      {invoice.description && (
        <p className="text-[13px] text-text-secondary mb-2 leading-snug">{invoice.description}</p>
      )}
      {invoice.amount && (
        <p className="text-[18px] font-semibold text-text-primary mb-2 tabular-nums">{invoice.amount}</p>
      )}
      {invoice.due && (
        <p className="text-[12px] text-text-muted mb-1">Due: {invoice.due}</p>
      )}
      {invoice.invoiceId && (
        <p className="text-[11px] text-text-muted font-mono mb-3 truncate">ID: {invoice.invoiceId}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-[12px] text-text-secondary">{invoice.status}</span>
        </div>
        {invoice.payUrl && (
          <a
            href={invoice.payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium text-text-primary hover:underline no-underline"
          >
            Pay now &rarr;
          </a>
        )}
        {!invoice.payUrl && invoice.status.toLowerCase() === "draft" && (
          <span className="text-[12px] text-text-muted">Draft</span>
        )}
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onAccept }: { proposal: ParsedProposal; onAccept?: () => void }) {
  return (
    <div className="border-l-4 border-l-[#0a0a0a] bg-surface-muted rounded-lg p-4 max-w-[340px] w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[14px]">&#128203;</span>
        <span className="text-[14px] font-medium text-text-primary">Proposal</span>
      </div>
      {proposal.scope && (
        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Scope</span>
          <p className="text-[13px] text-text-primary leading-snug mt-0.5">{proposal.scope}</p>
        </div>
      )}
      <div className="flex gap-4 mb-3">
        {proposal.budget && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Budget</span>
            <p className="text-[14px] font-semibold text-text-primary mt-0.5">{proposal.budget}</p>
          </div>
        )}
        {proposal.timeline && (
          <div>
            <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">Timeline</span>
            <p className="text-[14px] font-semibold text-text-primary mt-0.5">{proposal.timeline}</p>
          </div>
        )}
      </div>
      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer"
        >
          Accept proposal
        </button>
      )}
    </div>
  );
}

function FileCard({ content, fileUrl }: { content: string; fileUrl: string | null }) {
  const url = fileUrl || "#";
  const name = content || getFileName(url);
  const showThumbnail = fileUrl && isImageUrl(fileUrl);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block no-underline max-w-[280px] w-full">
      <div className="border border-border rounded-lg p-2.5 hover:border-border-hover transition-colors">
        {showThumbnail && (
          <div className="mb-2 rounded overflow-hidden bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={name} className="w-full h-auto max-h-[160px] object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <span className="text-text-muted flex-shrink-0"><FileIcon /></span>
          <span className="text-[13px] text-text-primary truncate flex-1">{name}</span>
          <span className="text-text-muted flex-shrink-0 hover:text-text-primary transition-colors"><DownloadIcon /></span>
        </div>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Inline form components
// ---------------------------------------------------------------------------

function InvoiceForm({ onSend, onCancel, sending }: { onSend: (desc: string, amount: string, due: string) => void; onCancel: () => void; sending: boolean }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  return (
    <div className="border border-border rounded-lg p-3.5 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-text-primary">Send Invoice</span>
        <button onClick={onCancel} className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
      </div>
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none mb-2 focus:border-border-hover transition-colors"
      />
      <div className="flex gap-2 mb-3">
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
      <button
        onClick={() => onSend(desc, amount, due)}
        disabled={!desc.trim() || !amount.trim() || sending}
        className="px-4 py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        {sending ? "Sending..." : "Send invoice"}
      </button>
    </div>
  );
}

function ProposalForm({ onSend, onCancel, sending }: { onSend: (scope: string, budget: string, timeline: string) => void; onCancel: () => void; sending: boolean }) {
  const [scope, setScope] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");

  return (
    <div className="border border-border rounded-lg p-3.5 mx-3 mb-2 bg-background animate-[slideDown_0.2s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-text-primary">Send Proposal</span>
        <button onClick={onCancel} className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
      </div>
      <textarea
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        placeholder="Project scope..."
        rows={3}
        className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none resize-none mb-2 focus:border-border-hover transition-colors"
      />
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="$5,000"
          className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-surface-muted border border-border rounded-md px-3 py-2 outline-none focus:border-border-hover transition-colors"
        />
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
        className="px-4 py-2 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        {sending ? "Sending..." : "Send proposal"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ProjectChatProps {
  projectId: string;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

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
      setMessages(data);
    } catch {
      // Silent fail on poll
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // ---- Auto-scroll with scroll-awareness ----

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect if user scrolled up
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
    setMessages((prev) => [...prev, optimisticMsg]);
    userScrolledRef.current = false;
    textareaRef.current?.focus();

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content: text }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setInputValue(text);
        setIsSending(false);
        return;
      }

      const created: ChatMessage = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? created : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
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
    setMessages((prev) => [...prev, optimisticMsg]);
    userScrolledRef.current = false;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setIsSending(false);
        return;
      }

      const created: ChatMessage = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? created : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- Invoice handler ----

  async function handleSendInvoice(desc: string, amount: string, due: string) {
    if (!desc.trim() || !amount.trim() || isSending) return;

    const rawAmount = amount.replace(/[$,]/g, "");
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
          description: desc.trim(),
          amount: amountCents,
          dueDate: due || undefined,
          customerEmail: "",
          customerName: "",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create invoice" }));
        toast(err.error || "Failed to send invoice");
        setIsSending(false);
        return;
      }

      toast("Invoice sent");
      userScrolledRef.current = false;
      await fetchMessages();
    } catch {
      toast("Failed to send invoice");
    }

    setIsSending(false);
    setActiveAction(null);
  }

  // ---- Proposal handler ----

  function handleSendProposal(scope: string, budget: string, timeline: string) {
    if (!scope.trim()) return;
    const content = `\u{1F4CB} PROPOSAL\nScope: ${scope.trim()}\nBudget: ${budget.trim() || "TBD"}\nTimeline: ${timeline.trim() || "TBD"}`;
    sendStructuredMessage(content);
  }

  // ---- Accept handler ----

  function handleAccept() {
    sendStructuredMessage("\u2705 Terms accepted, let's proceed.");
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
      setMessages((prev) => [...prev, created]);
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

  // ---- Accept proposal helper ----

  function handleAcceptProposal() {
    sendStructuredMessage("\u2705 Proposal accepted. Let's move forward.");
  }

  // ---- Quick action definitions ----

  const actions: { key: ActiveAction; icon: string; label: string }[] = [
    { key: "invoice", icon: "\u{1F4B0}", label: "Invoice" },
    { key: "proposal", icon: "\u{1F4CB}", label: "Proposal" },
    { key: "files", icon: "\u{1F4CE}", label: "Files" },
    { key: "accept", icon: "\u2705", label: "Accept" },
  ];

  const charCount = inputValue.length;

  // ---- Render ----

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {isLoading && <LoadingSkeleton />}

        {!isLoading && messages.length === 0 && <EmptyState />}

        {!isLoading && messages.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const isSameGroup =
                prev &&
                prev.messageType !== "system" &&
                msg.messageType !== "system" &&
                prev.senderId === msg.senderId &&
                !prev.content?.includes("INVOICE") &&
                !prev.content?.includes("PROPOSAL") &&
                !msg.content?.includes("INVOICE") &&
                !msg.content?.includes("PROPOSAL");

              // System message
              if (msg.messageType === "system" && !msg.content?.includes("INVOICE") && !msg.content?.includes("PROPOSAL")) {
                return <SystemMessage key={msg.id} content={msg.content} />;
              }

              // Invoice message
              const invoice = parseInvoiceContent(msg.content);
              if (invoice) {
                return (
                  <div key={msg.id} className="flex justify-center py-2 animate-[fadeInUp_0.25s_ease-out]">
                    <InvoiceCard invoice={invoice} />
                  </div>
                );
              }

              // Proposal message
              const proposal = parseProposalContent(msg.content);
              if (proposal) {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex py-2 animate-[fadeInUp_0.25s_ease-out] ${isOwn ? "justify-end" : "justify-start"}`}>
                    <ProposalCard proposal={proposal} onAccept={!isOwn ? handleAcceptProposal : undefined} />
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
                  {/* Sender name + timestamp */}
                  {showMeta && (
                    <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-[12px] text-text-muted">{isOwn ? "You" : msg.senderName || "Unknown"}</span>
                      <span className="text-[11px] font-mono text-text-muted">{formatTime(msg.createdAt)}</span>
                    </div>
                  )}

                  {/* File message */}
                  {msg.messageType === "file" ? (
                    <FileCard content={msg.content} fileUrl={msg.fileUrl} />
                  ) : (
                    /* Text bubble */
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
        />
      )}
      {activeAction === "proposal" && (
        <ProposalForm
          onSend={handleSendProposal}
          onCancel={() => setActiveAction(null)}
          sending={isSending}
        />
      )}

      {/* Quick actions bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => {
              if (action.key === "files") {
                fileInputRef.current?.click();
              } else if (action.key === "accept") {
                handleAccept();
              } else {
                setActiveAction(activeAction === action.key ? null : action.key);
              }
            }}
            className={`
              flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer
              ${activeAction === action.key
                ? "border-[#171717] text-text-primary bg-surface-muted"
                : "text-text-muted border-border hover:border-border-hover hover:text-text-secondary"
              }
            `}
          >
            <span className="text-[12px]">{action.icon}</span>
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
            <ArrowUpIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
