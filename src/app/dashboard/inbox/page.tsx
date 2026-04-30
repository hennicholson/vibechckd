"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import ProjectChat from "@/components/projects/ProjectChat";
import { useToast } from "@/components/Toast";
import { useConversationStream } from "@/lib/use-conversation-stream";
import { useTypingIndicator } from "@/lib/use-typing-indicator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Unified conversation shape returned by the new GET /api/conversations.
// Supersedes the old `Conversation` (project-only) + `DMThread` (dm-only)
// types — every chat surface, regardless of kind, fits this row.
type UnifiedConversation = {
  id: string;
  kind: "dm" | "project" | "job_application";
  projectId: string | null;
  jobApplicationId: string | null;
  title: string | null;
  updatedAt: string;
  lastReadAt: string | null;
  lastMessageContent: string | null;
  lastMessageKind: string | null;
  lastMessageAt: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  participants: Array<{ id: string; name: string | null; image: string | null }> | null;
};

type Conversation = {
  projectId: string;
  projectName: string;
  lastMessage: string;
  lastSenderName: string;
  lastMessageAt: string;
  status?: string;
};

type DMThread = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
};

type DMMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: "text" | "file";
  fileUrl: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTimestamp(dateStr: string): string {
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inbox Menu (3-dot)
// ---------------------------------------------------------------------------

function InboxMenu({ onOpenContacts }: { onOpenContacts: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("available");
  const [showContacts, setShowContacts] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved status
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.availability) setStatus(data.availability); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const setAvailability = async (val: string) => {
    setStatus(val);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: val }),
      });
      toast(`Status: ${val}`, "success");
    } catch {
      toast("Failed to update", "error");
    }
  };

  const statuses = [
    { value: "available", label: "Available", color: "#22c55e" },
    { value: "selective", label: "Selective", color: "#f59e0b" },
    { value: "unavailable", label: "Away", color: "#a3a3a3" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[200px] bg-background border border-border rounded-lg shadow-lg py-1 z-50 animate-[fadeInUp_0.1s_ease-out]">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Status
          </div>
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setAvailability(s.value)}
              className={`w-full text-left px-3 py-2 text-[12px] hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2 ${
                status === s.value ? "text-text-primary font-medium" : "text-text-secondary"
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
              {status === s.value && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          <div className="h-px bg-border my-1" />

          <button
            onClick={() => { setOpen(false); onOpenContacts(); }}
            className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            Contacts
          </button>

          <a
            href="/dashboard/settings"
            className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer flex items-center gap-2 no-underline"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Settings
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Project Card (with balance)
// ---------------------------------------------------------------------------

function RecentProjectCard({ convo, onClick }: { convo: Conversation; onClick: () => void }) {
  const [paidCents, setPaidCents] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${convo.projectId}/balance`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setPaidCents(data.totalPaid || 0);
      })
      .catch(() => {});
  }, [convo.projectId]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-background/80 backdrop-blur-sm border border-white/60 rounded-[10px] px-4 py-3 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:border-white/80 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[13px] font-medium text-text-primary truncate">
          {convo.projectName}
        </span>
        <span className="text-[10px] font-mono text-text-muted leading-none flex-shrink-0 ml-2">
          {relativeTimestamp(convo.lastMessageAt)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-muted truncate flex-1">
          <span className="text-text-secondary">{convo.lastSenderName}:</span> {convo.lastMessage}
        </p>
        {paidCents !== null && paidCents > 0 && (
          <span className="text-[13px] font-semibold text-positive tabular-nums ml-2 flex-shrink-0 animate-pulse">
            ${(paidCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notification Prompt
// ---------------------------------------------------------------------------

function NotificationPrompt({ onDismiss }: { onDismiss: () => void }) {
  const handleEnable = async () => {
    try {
      await Notification.requestPermission();
    } catch {
      // silently fail
    }
    localStorage.setItem("vibechckd-notif-prompted", "true");
    onDismiss();
  };

  const handleDismiss = () => {
    localStorage.setItem("vibechckd-notif-prompted", "true");
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 max-w-[320px]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
          <BellIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-text-primary mb-1">
            Enable notifications
          </p>
          <p className="text-[12px] text-text-muted leading-relaxed mb-3">
            Stay updated on new messages from your projects and team.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              className="px-3 py-1.5 text-[12px] font-medium bg-[#171717] text-white rounded-md hover:bg-[#0a0a0a] transition-colors cursor-pointer"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-0.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <CloseIcon />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// DM Chat Component
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url);
}

function getFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() || "file");
  } catch {
    return "file";
  }
}

function DMChat({ threadId, otherUserName }: { threadId: string; otherUserName: string }) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledRef = useRef(false);

  const currentUserId = session?.user?.id;

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/dm/messages?threadId=${threadId}`);
      if (!res.ok) return;
      const data: DMMessage[] = await res.json();
      setMessages(data);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Typing indicator — pings on compose, listens for peer pings.
  const { pingTyping, typingPeer, onPeerTyping } = useTypingIndicator(threadId);

  // SSE push: threadId == conversationId post-unification, so subscribe
  // directly. The 4s poll below stays as a fallback and self-heals if the
  // stream drops, but moves to 30s once the SSE stream is alive.
  useConversationStream(threadId, {
    onMessage: () => {
      fetchMessages();
    },
    onTyping: (e) => {
      if (e.userId === currentUserId) return;
      onPeerTyping(e);
    },
  });

  useEffect(() => {
    const interval = setInterval(fetchMessages, 30_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll. Two passes:
  //   - INITIAL load (or thread-switch) → snap to bottom instantly. No user
  //     ever wants to start a chat halfway up the history.
  //   - SUBSEQUENT message arrivals → smooth-scroll only if the user is
  //     within ~80px of the bottom (i.e., they hadn't scrolled up to read
  //     older messages). Mirrors how iMessage / Slack behave.
  const initialLoadedRef = useRef(false);
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (!userScrolledRef.current) {
        // requestAnimationFrame so the layout has flushed before we measure.
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior });
        });
      }
    },
    []
  );

  // Reset on thread switch so the scroll anchors fresh.
  useEffect(() => {
    initialLoadedRef.current = false;
    userScrolledRef.current = false;
  }, [threadId]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      scrollToBottom("auto");
    } else {
      scrollToBottom("smooth");
    }
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledRef.current = distanceFromBottom > 80;
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [inputValue]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputValue("");

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: DMMessage = {
      id: optimisticId,
      senderId: currentUserId || "",
      senderName: session?.user?.name || "You",
      content: text,
      messageType: "text",
      fileUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    userScrolledRef.current = false;
    textareaRef.current?.focus();

    try {
      const res = await fetch("/api/dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content: text }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        toast("Failed to send message");
        setInputValue(text);
        setIsSending(false);
        return;
      }

      const created: DMMessage = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? created : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast("Failed to send message");
      setInputValue(text);
    }

    setIsSending(false);
  }

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

      const res = await fetch("/api/dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          content: file.name,
          messageType: "file",
          fileUrl: url,
        }),
      });

      if (!res.ok) {
        toast("Failed to send file");
        return;
      }

      const created: DMMessage = await res.json();
      setMessages((prev) => [...prev, created]);
      userScrolledRef.current = false;
      toast("File shared");
    } catch {
      toast("Upload failed");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {isLoading && (
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
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <ChatBubbleIcon />
            <div className="text-center">
              <p className="text-[14px] font-medium text-text-primary">Start the conversation</p>
              <p className="text-[13px] text-text-muted mt-0.5">Send a message to {otherUserName}</p>
            </div>
          </div>
        )}

        {!isLoading && messages.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const isOwn = msg.senderId === currentUserId;
              const isSameGroup = prev && prev.senderId === msg.senderId;
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

                  {msg.messageType === "file" && msg.fileUrl ? (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block no-underline max-w-[calc(100vw-48px)] sm:max-w-[280px] w-full">
                      <div className="border border-border rounded-lg overflow-hidden hover:border-neutral-300 transition-colors">
                        {isImageUrl(msg.fileUrl) && (
                          <div className="bg-surface-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.fileUrl} alt={msg.content} className="w-full h-auto max-h-[160px] object-cover" />
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 p-2.5">
                          <span className="text-text-muted flex-shrink-0"><FileIcon /></span>
                          <span className="text-[13px] text-text-primary truncate flex-1">{msg.content || getFileName(msg.fileUrl)}</span>
                          <span className="text-text-muted flex-shrink-0 hover:text-text-primary transition-colors"><DownloadIcon /></span>
                        </div>
                      </div>
                    </a>
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

      {/* Typing indicator (sits above the input row) */}
      {typingPeer && (
        <div className="px-4 py-1 text-[11px] text-text-muted animate-[fadeInUp_0.18s_ease-out]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex gap-0.5">
              <span
                className="w-1 h-1 rounded-full bg-text-muted"
                style={{ animation: "typingDot 1.2s ease-in-out infinite" }}
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
            {typingPeer.name || otherUserName} is typing…
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

      {/* Input row */}
      <div className="border-t border-border bg-background">
        <div className="flex items-end gap-2 px-3 py-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-md hover:bg-surface-muted"
            aria-label="Attach file"
          >
            <PaperclipIcon />
          </button>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              if (e.target.value.length <= 2000) {
                setInputValue(e.target.value);
                pingTyping();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 text-[13px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none resize-none leading-relaxed max-h-[100px]"
            style={{ minHeight: "22px" }}
          />
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
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inbox Page
// ---------------------------------------------------------------------------


export default function InboxPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // ── State ──
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<{ userId: string; name: string; image: string; role: string }[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Selected conversation derived from URL `?c=<id>` for shareability +
  // browser-back UX. We also keep a useState mirror so React-tracked changes
  // flow normally; URL is the source-of-truth on initial mount and history
  // navigation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = new URLSearchParams(window.location.search).get("c");
    if (initial) setSelectedId(initial);
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get("c");
      setSelectedId(id);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function selectConversation(id: string | null) {
    setSelectedId(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("c", id);
    else url.searchParams.delete("c");
    window.history.replaceState(null, "", url.toString());
  }

  // ── Fetch ──
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: UnifiedConversation[] };
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refetch on focus + low-frequency poll. SSE on the SELECTED conversation
  // updates the chat panel directly; this loop just refreshes the rail.
  useEffect(() => {
    const onFocus = () => fetchConversations();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchConversations, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [fetchConversations]);

  // Mark the active conversation read whenever it changes. Server bumps
  // lastReadAt + emits `read` SSE so peers see read receipts later.
  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/conversations/${selectedId}/read`, { method: "POST" }).catch(() => {});
  }, [selectedId]);

  // Notification prompt (browser permission, not Whop push) on first visit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return;
    const prompted = localStorage.getItem("vibechckd-notif-prompted");
    if (!prompted && Notification.permission === "default") {
      const t = setTimeout(() => setShowNotifPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Derived ──
  const filtered = search.trim()
    ? conversations.filter((c) => {
        const title = (c.title || "").toLowerCase();
        const last = (c.lastMessageContent || "").toLowerCase();
        const q = search.toLowerCase();
        return title.includes(q) || last.includes(q);
      })
    : conversations;

  const selected = conversations.find((c) => c.id === selectedId) || null;
  const otherParticipant = selected?.participants?.find((p) => p.id !== currentUserId) || null;

  // ── Handlers ──
  async function handleArchive(e: React.MouseEvent, conv: UnifiedConversation) {
    e.stopPropagation();
    if (conv.kind !== "project" || !conv.projectId) return;
    setActionLoading(conv.id);
    try {
      const res = await fetch(`/api/projects/${conv.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
        if (selectedId === conv.id) selectConversation(null);
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  }

  async function startDmWith(userId: string) {
    try {
      const res = await fetch("/api/dm/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
      });
      if (!res.ok) {
        toast("Failed to start conversation");
        return;
      }
      const data = (await res.json()) as { threadId: string };
      // The new threadId is also the conversationId post-unification.
      // Refresh the rail so the new conversation row appears.
      await fetchConversations();
      selectConversation(data.threadId);
      setShowContacts(false);
    } catch {
      toast("Failed to start conversation");
    }
  }

  // Type-aware visual badge + label for a conversation row.
  function kindMeta(c: UnifiedConversation): {
    badge: string;
    badgeTone: string;
  } {
    if (c.kind === "project") {
      return { badge: "Project", badgeTone: "text-text-secondary bg-surface-muted" };
    }
    if (c.kind === "job_application") {
      return { badge: "Job", badgeTone: "text-warning bg-warning/10" };
    }
    return { badge: "DM", badgeTone: "text-text-muted bg-surface-muted" };
  }

  const hasChatOpen = !!selectedId;

  return (
    <div className="flex h-[calc(100vh-48px)] md:h-screen">
      {/* ── Conversation list rail ── */}
      <div
        className={`${hasChatOpen ? "hidden md:flex" : "flex"} w-full md:w-[320px] border-r-0 md:border-r border-border flex-shrink-0 flex-col h-full bg-background`}
      >
        {/* Header */}
        <div className="px-4 pt-4 md:pt-5 pb-2 flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Inbox
          </h1>
          <InboxMenu
            onOpenContacts={() => {
              setShowContacts(true);
              setContactsLoading(true);
              fetch("/api/dm/contacts")
                .then((r) => (r.ok ? r.json() : []))
                .then((data) => setContacts(data))
                .catch(() => setContacts([]))
                .finally(() => setContactsLoading(false));
            }}
          />
        </div>

        {/* Search */}
        <div className="px-3 pt-1 pb-2 border-b border-border">
          <div className="flex items-center gap-2 bg-surface-muted rounded-md px-2.5 py-1.5">
            <span className="text-text-muted flex-shrink-0">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="flex-1 text-[12px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-6 text-center">
              <span className="text-[12px] text-text-muted font-mono">Loading…</span>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-10 text-center">
              <ChatBubbleIcon />
              <p className="text-[13px] text-text-primary font-medium mt-3 mb-1">
                {search.trim() ? "No matches" : "No conversations yet"}
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed max-w-[260px] mx-auto">
                {search.trim()
                  ? "Try a different search term."
                  : "Start a DM, post a job, or join a project to begin a thread."}
              </p>
            </div>
          )}
          {filtered.map((conv) => {
            const meta = kindMeta(conv);
            const unread = conv.unreadCount > 0 && selectedId !== conv.id;
            const showActions = hoveredId === conv.id && conv.kind === "project";
            const avatar = otherParticipantOf(conv, currentUserId);
            const titleText = conv.title || "Conversation";

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectConversation(conv.id);
                  }
                }}
                className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer ${
                  selectedId === conv.id
                    ? "bg-surface-muted"
                    : "bg-background hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar — DM/job_app show the other participant; project
                      shows a pill icon. Sized + spaced to keep all three
                      kinds visually aligned. */}
                  {conv.kind === "project" ? (
                    <div className="w-8 h-8 rounded-md bg-surface-muted flex-shrink-0 flex items-center justify-center text-text-muted">
                      <ChatBubbleIcon />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex-shrink-0 flex items-center justify-center text-[12px] font-medium text-text-muted overflow-hidden">
                      {avatar?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar.image}
                          alt={avatar.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (avatar?.name || titleText).charAt(0).toUpperCase()
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[13px] font-body truncate flex-1 ${
                          unread
                            ? "text-text-primary font-semibold"
                            : "text-text-primary font-medium"
                        }`}
                      >
                        {titleText}
                      </span>
                      <span
                        className={`text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${meta.badgeTone}`}
                      >
                        {meta.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-[12px] font-body truncate flex-1 ${
                          unread ? "text-text-secondary" : "text-text-muted"
                        }`}
                      >
                        {conv.lastMessageKind === "file" ? (
                          <span className="italic">Shared a file</span>
                        ) : conv.lastMessageKind === "invoice" ? (
                          <span className="italic">Sent an invoice</span>
                        ) : (
                          conv.lastMessageContent || "No messages yet"
                        )}
                      </p>
                      {showActions ? (
                        <button
                          onClick={(e) => handleArchive(e, conv)}
                          disabled={actionLoading === conv.id}
                          title="Archive"
                          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-neutral-200 transition-colors duration-150 cursor-pointer disabled:opacity-40 flex-shrink-0"
                        >
                          <ArchiveIcon />
                        </button>
                      ) : (
                        <span className="text-[10.5px] font-mono text-text-muted flex-shrink-0 tabular-nums">
                          {conv.lastMessageAt
                            ? relativeTimestamp(conv.lastMessageAt)
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {unread && (
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className={`${hasChatOpen ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 h-[44px] border-b border-border flex-shrink-0">
              <button
                onClick={() => selectConversation(null)}
                className="md:hidden flex items-center gap-1 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px]"
              >
                <BackIcon />
                Back
              </button>
              {selected.kind !== "project" && otherParticipant && (
                <div className="w-7 h-7 rounded-full bg-surface-muted flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-text-muted overflow-hidden">
                  {otherParticipant.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={otherParticipant.image}
                      alt={otherParticipant.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (otherParticipant.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
              )}
              <span className="text-[13px] font-medium text-text-primary truncate flex-1">
                {selected.title || "Conversation"}
              </span>
              {selected.kind === "project" && selected.projectId && (
                <button
                  onClick={() =>
                    router.push(`/dashboard/projects/${selected.projectId}`)
                  }
                  title="Open project"
                  className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-md hover:bg-surface-muted flex-shrink-0"
                >
                  <span className="hidden sm:inline">Open project</span>
                  <ExternalLinkIcon />
                </button>
              )}
            </div>

            {/* Body — pick the right chat surface based on conversation kind.
                Project conversations get the rich ProjectChat with quick
                actions / invoice cards / member roster. DM + job_application
                share the DMChat panel for a focused 1:1 thread. */}
            <div className="flex-1 min-h-0">
              {selected.kind === "project" && selected.projectId ? (
                <ProjectChat projectId={selected.projectId} />
              ) : (
                <DMChat
                  threadId={selected.id}
                  otherUserName={otherParticipant?.name || "User"}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState
            conversations={conversations}
            onSelect={selectConversation}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Contacts panel */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowContacts(false)}
          />
          <div className="relative w-full max-w-[340px] bg-background border-l border-border h-full flex flex-col animate-[slideInRight_0.2s_ease-out]">
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-text-primary">
                Contacts
              </h2>
              <button
                onClick={() => setShowContacts(false)}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2 bg-surface-muted rounded-md px-2.5 py-1.5">
                <SearchIcon />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts…"
                  className="flex-1 text-[12px] text-text-primary placeholder:text-text-muted bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-surface-muted rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-text-muted">
                  No contacts found
                </div>
              ) : (
                <div className="py-1">
                  {contacts
                    .filter(
                      (c) =>
                        !contactSearch ||
                        c.name.toLowerCase().includes(contactSearch.toLowerCase())
                    )
                    .map((contact) => (
                      <button
                        key={contact.userId}
                        onClick={() => startDmWith(contact.userId)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted overflow-hidden flex-shrink-0">
                          {contact.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={contact.image}
                              alt={contact.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            contact.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-medium text-text-primary truncate">
                            {contact.name}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {contact.role}
                          </p>
                        </div>
                        <ChatBubbleIcon />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNotifPrompt && (
        <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />
      )}
    </div>
  );
}

// ── Helpers used by InboxPage ──────────────────────────────────────────────

function otherParticipantOf(
  c: UnifiedConversation,
  currentUserId: string | undefined
): { id: string; name: string | null; image: string | null } | null {
  if (!c.participants || c.participants.length === 0) return null;
  const other = c.participants.find((p) => p.id !== currentUserId);
  return other ?? c.participants[0];
}

function EmptyState({
  conversations,
  onSelect,
  currentUserId,
}: {
  conversations: UnifiedConversation[];
  onSelect: (id: string) => void;
  currentUserId: string | undefined;
}) {
  const recent = conversations.slice(0, 3);
  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div className="w-full max-w-[420px]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-4">
            Pick up where you left off
          </p>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <ChatBubbleIcon />
              <span className="text-[13px] text-text-muted mt-3">
                No conversations yet
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((c) => {
                const other = otherParticipantOf(c, currentUserId);
                const titleText = c.title || "Conversation";
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className="w-full text-left bg-background border border-border rounded-[10px] p-4 hover:border-border-hover hover:bg-surface-muted transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {c.kind === "project" ? (
                        <div className="w-8 h-8 rounded-md bg-surface-muted flex-shrink-0 flex items-center justify-center text-text-muted">
                          <ChatBubbleIcon />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted flex-shrink-0 overflow-hidden">
                          {other?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={other.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (other?.name || titleText).charAt(0).toUpperCase()
                          )}
                        </div>
                      )}
                      <span className="text-[14px] font-medium text-text-primary truncate flex-1">
                        {titleText}
                      </span>
                      {c.lastMessageAt && (
                        <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
                          {relativeTimestamp(c.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-text-muted truncate pl-11">
                      {c.lastMessageContent || "No messages yet"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
