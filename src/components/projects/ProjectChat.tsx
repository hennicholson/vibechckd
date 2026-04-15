"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Button from "../Button";
import { useToast } from "../Toast";

type QuickAction = "proposal" | "invoice" | "terms" | "review" | null;

// --- Types ---

type MessageType = "text" | "file" | "system" | "ai";

interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: MessageType;
  fileUrl: string | null;
  createdAt: string;
}

// --- Relative time helper ---

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const sentAt = new Date(dateStr).getTime();
  const diffMs = now - sentAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(sentAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

const MAX_CHARS = 500;
const POLL_INTERVAL = 5000;

// --- Icons ---

function PaperclipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.49" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-text-primary text-background">
        <BotIcon />
      </div>
      <div className="flex items-center gap-1 px-3 py-2 rounded-md bg-surface-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typingDot_1.4s_ease-in-out_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typingDot_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-[typingDot_1.4s_ease-in-out_0.4s_infinite]" />
      </div>
    </div>
  );
}

// --- Component ---

interface ProjectChatProps {
  projectId: string;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const { data: session } = useSession();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [quickAction, setQuickAction] = useState<QuickAction>(null);

  // Quick action form state
  const [proposalScope, setProposalScope] = useState("");
  const [proposalBudget, setProposalBudget] = useState("");
  const [proposalTimeline, setProposalTimeline] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDue, setInvoiceDue] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name || "You";

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      setMessages(data);
    } catch {
      // silently fail on poll
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  function handleToggleAi() {
    const next = !aiEnabled;
    setAiEnabled(next);
    toast(next ? "AI assistant enabled" : "AI assistant disabled");
  }

  function handleAttach() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = "";

    try {
      toast("Uploading file...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "asset");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        toast("Failed to upload file");
        return;
      }

      const { url } = await uploadRes.json();

      // Send file message
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
      toast("File shared");
    } catch {
      toast("Failed to upload file");
    }
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputValue("");

    // Optimistically add the message
    const optimisticId = `optimistic-${Date.now()}`;
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
    inputRef.current?.focus();

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content: text }),
      });

      if (!res.ok) {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setInputValue(text);
        setIsSending(false);
        return;
      }

      const created: ChatMessage = await res.json();
      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? created : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
      setInputValue(text);
    }

    setIsSending(false);

    // Simulate AI typing (cosmetic for now)
    if (aiEnabled) {
      setIsAiTyping(true);
      setTimeout(() => {
        setIsAiTyping(false);
      }, 2000);
    }
  }

  function resetQuickActionForm() {
    setQuickAction(null);
    setProposalScope("");
    setProposalBudget("");
    setProposalTimeline("");
    setInvoiceDesc("");
    setInvoiceAmount("");
    setInvoiceDue("");
    setReviewRating(0);
    setReviewComment("");
  }

  async function sendQuickMessage(content: string) {
    if (isSending) return;
    setIsSending(true);

    const optimisticId = `optimistic-${Date.now()}`;
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
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? created : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
    }

    setIsSending(false);
    resetQuickActionForm();

    if (aiEnabled) {
      setIsAiTyping(true);
      setTimeout(() => setIsAiTyping(false), 2000);
    }
  }

  function handleSendProposal() {
    if (!proposalScope.trim()) return;
    const content = `\u{1F4CB} PROPOSAL\nScope: ${proposalScope.trim()}\nBudget: ${proposalBudget.trim() || "TBD"}\nTimeline: ${proposalTimeline.trim() || "TBD"}`;
    sendQuickMessage(content);
  }

  function handleSendInvoice() {
    if (!invoiceDesc.trim() || !invoiceAmount.trim()) return;
    const content = `\u{1F4B0} INVOICE\nDescription: ${invoiceDesc.trim()}\nAmount: ${invoiceAmount.trim()}\nDue: ${invoiceDue || "Upon receipt"}`;
    sendQuickMessage(content);
  }

  function handleAssembleTeam() {
    const content = `\u{1F465} I'd like to assemble a team for this project. Let's discuss roles and specialties needed.\n\u2192 Open Team Builder: /dashboard/teams/new`;
    sendQuickMessage(content);
  }

  function handleAcceptTerms() {
    const content = `\u2705 TERMS ACCEPTED\nBoth parties have agreed to proceed. Project is now active.`;
    sendQuickMessage(content);
  }

  function handleSendReview() {
    if (reviewRating === 0) return;
    const stars = "\u2B50".repeat(reviewRating);
    const content = `\u2B50 REVIEW (${reviewRating}/5) ${stars}\n${reviewComment.trim() || "No comment provided."}`;
    sendQuickMessage(content);
  }

  const quickActions = [
    { key: "proposal" as const, icon: "\u{1F4CB}", label: "Send Proposal" },
    { key: "invoice" as const, icon: "\u{1F4B0}", label: "Send Invoice" },
    { key: "team" as const, icon: "\u{1F465}", label: "Assemble Team" },
    { key: "files" as const, icon: "\u{1F4CE}", label: "Share Files" },
    { key: "terms" as const, icon: "\u2705", label: "Accept Terms" },
    { key: "review" as const, icon: "\u2B50", label: "Leave Review" },
  ];

  const charCount = inputValue.length;

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-text-primary font-body">
            Chat
          </span>
        </div>
        <button
          onClick={handleToggleAi}
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono
            transition-colors duration-150 cursor-pointer
            ${
              aiEnabled
                ? "bg-text-primary text-background"
                : "bg-surface-muted text-text-muted hover:text-text-secondary"
            }
          `}
        >
          AI
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
              aiEnabled ? "bg-positive" : "bg-border"
            }`}
          />
        </button>
      </div>

      {/* AI banner */}
      {aiEnabled && (
        <div className="px-4 py-1.5 border-b border-border bg-background-alt">
          <span className="text-[11px] font-mono text-text-muted">
            AI assistant is active
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="text-[12px] text-text-muted font-mono">
              Loading messages...
            </span>
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <span className="text-[12px] text-text-muted font-body italic">
              No messages yet. Start the conversation.
            </span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isSameSenderAsPrev =
            prevMsg &&
            prevMsg.messageType !== "system" &&
            msg.messageType !== "system" &&
            prevMsg.senderId === msg.senderId;
          const isDifferentSender = prevMsg && !isSameSenderAsPrev;

          if (msg.messageType === "system") {
            return (
              <div key={msg.id} className="flex justify-center py-3">
                <span className="text-[12px] italic text-text-muted font-body">
                  {msg.content}
                </span>
              </div>
            );
          }

          const isOwn = msg.senderId === currentUserId;
          const isAi = msg.messageType === "ai";
          const showHeader = !isSameSenderAsPrev;
          const displayName = msg.senderName || "Unknown";
          const initial = isAi ? null : getInitials(displayName);

          return (
            <div key={msg.id}>
              {/* Divider between different senders */}
              {isDifferentSender && (
                <div className="border-t border-border/50 my-2" />
              )}

              <div
                className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${
                  isSameSenderAsPrev ? "mt-0.5" : "mt-2"
                }`}
              >
                {/* Avatar */}
                {showHeader ? (
                  <div
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
                      text-[10px] font-medium font-mono
                      ${
                        isAi
                          ? "bg-text-primary text-background"
                          : "bg-surface-muted text-text-secondary"
                      }
                    `}
                  >
                    {isAi ? <BotIcon /> : initial}
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-6" />
                )}

                {/* Content */}
                <div
                  className={`
                    max-w-[75%] min-w-0
                    ${isOwn ? "items-end" : "items-start"}
                  `}
                >
                  {/* Sender + time */}
                  {showHeader && (
                    <div
                      className={`flex items-center gap-2 mb-0.5 ${
                        isOwn ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="text-[12px] font-medium text-text-primary font-body">
                        {isOwn ? "You" : displayName}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        {relativeTime(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {/* Message body */}
                  {msg.messageType === "file" ? (
                    <a
                      href={msg.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block no-underline"
                    >
                      <div
                        className={`
                          border border-border rounded-md px-3 py-2 flex items-center gap-2.5
                          hover:bg-surface-muted/80 transition-colors duration-150
                          ${isOwn ? "bg-surface-muted" : "bg-background"}
                        `}
                      >
                        <span className="text-text-muted">
                          <FileIcon />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-text-primary font-body truncate">
                            {msg.content || getFileName(msg.fileUrl || "")}
                          </div>
                        </div>
                        <span className="text-text-muted hover:text-text-primary transition-colors duration-150">
                          <DownloadIcon />
                        </span>
                      </div>
                    </a>
                  ) : (
                    <div
                      className={`
                        rounded-md px-3 py-2 text-[14px] font-body text-text-primary leading-relaxed whitespace-pre-wrap
                        ${isAi ? "bg-surface-muted border border-border" : ""}
                        ${isOwn && !isAi ? "bg-surface-muted" : ""}
                        ${!isOwn && !isAi ? "bg-background" : ""}
                      `}
                    >
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isAiTyping && (
          <div className="mt-2">
            <TypingIndicator />
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

      {/* Quick Actions toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border overflow-x-auto scrollbar-hide">
        {quickActions.map((action) => (
          <button
            key={action.key}
            onClick={() => {
              if (action.key === "team") {
                handleAssembleTeam();
              } else if (action.key === "files") {
                handleAttach();
              } else {
                setQuickAction(
                  quickAction === action.key ? null : (action.key as QuickAction)
                );
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium border rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              quickAction === action.key
                ? "border-text-primary text-text-primary bg-surface-muted"
                : "text-text-muted border-border hover:border-border-hover hover:text-text-primary"
            }`}
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Quick Action inline forms */}
      {quickAction === "proposal" && (
        <div className="bg-surface-muted rounded-[10px] p-3 mx-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-primary">Send Proposal</span>
            <button onClick={resetQuickActionForm} className="text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
          </div>
          <textarea
            value={proposalScope}
            onChange={(e) => setProposalScope(e.target.value)}
            placeholder="Project scope..."
            rows={3}
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none resize-none mb-2"
          />
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={proposalBudget}
              onChange={(e) => setProposalBudget(e.target.value)}
              placeholder="$5,000"
              className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none"
            />
            <input
              type="text"
              value={proposalTimeline}
              onChange={(e) => setProposalTimeline(e.target.value)}
              placeholder="2 weeks"
              className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none"
            />
          </div>
          <button
            onClick={handleSendProposal}
            disabled={!proposalScope.trim() || isSending}
            className="px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-[#fafafa] rounded-md hover:bg-[#171717]/90 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Send proposal
          </button>
        </div>
      )}

      {quickAction === "invoice" && (
        <div className="bg-surface-muted rounded-[10px] p-3 mx-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-primary">Send Invoice</span>
            <button onClick={resetQuickActionForm} className="text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
          </div>
          <input
            type="text"
            value={invoiceDesc}
            onChange={(e) => setInvoiceDesc(e.target.value)}
            placeholder="Description"
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none mb-2"
          />
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="$2,500"
              className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none"
            />
            <input
              type="date"
              value={invoiceDue}
              onChange={(e) => setInvoiceDue(e.target.value)}
              className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none"
            />
          </div>
          <button
            onClick={handleSendInvoice}
            disabled={!invoiceDesc.trim() || !invoiceAmount.trim() || isSending}
            className="px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-[#fafafa] rounded-md hover:bg-[#171717]/90 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Send invoice
          </button>
        </div>
      )}

      {quickAction === "terms" && (
        <div className="bg-surface-muted rounded-[10px] p-3 mx-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-primary">Accept Terms</span>
            <button onClick={resetQuickActionForm} className="text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
          </div>
          <p className="text-[12px] text-text-secondary font-body mb-3 leading-relaxed">
            By accepting, both parties agree to the scope, budget, and timeline discussed.
          </p>
          <button
            onClick={handleAcceptTerms}
            disabled={isSending}
            className="px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-[#fafafa] rounded-md hover:bg-[#171717]/90 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Accept &amp; Start
          </button>
        </div>
      )}

      {quickAction === "review" && (
        <div className="bg-surface-muted rounded-[10px] p-3 mx-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-text-primary">Leave Review</span>
            <button onClick={resetQuickActionForm} className="text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer">Cancel</button>
          </div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setReviewRating(star)}
                className={`text-[18px] cursor-pointer transition-colors ${
                  star <= reviewRating ? "opacity-100" : "opacity-25"
                }`}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                {"\u2B50"}
              </button>
            ))}
          </div>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Write your review..."
            rows={2}
            className="w-full text-[13px] font-body text-text-primary placeholder:text-text-muted bg-background border border-border rounded-md px-2.5 py-1.5 outline-none resize-none mb-2"
          />
          <button
            onClick={handleSendReview}
            disabled={reviewRating === 0 || isSending}
            className="px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-[#fafafa] rounded-md hover:bg-[#171717]/90 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Submit review
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border px-3 py-2.5 bg-background">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAttach}
            className="flex-shrink-0 p-1.5 text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer rounded"
            aria-label="Attach file"
          >
            <PaperclipIcon />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) {
                setInputValue(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 text-[14px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none"
          />
          {charCount > 0 && (
            <span
              className={`text-[10px] font-mono flex-shrink-0 tabular-nums ${
                charCount > MAX_CHARS * 0.9
                  ? "text-negative"
                  : "text-text-muted"
              }`}
            >
              {charCount}/{MAX_CHARS}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="!px-2.5 !py-1.5"
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
