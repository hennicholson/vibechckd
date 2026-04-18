"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import ProjectChat from "@/components/projects/ProjectChat";
import { useToast } from "@/components/Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InboxTab = "projects" | "messages";

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

  // Poll every 4 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
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

  const [activeTab, setActiveTab] = useState<InboxTab>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("vibechckd-inbox-tab");
      if (saved === "projects" || saved === "messages") return saved;
    }
    return "projects";
  });

  // --- Projects tab state ---
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<Record<string, string>>({});

  // --- Messages tab state ---
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [dmThreads, setDmThreads] = useState<DMThread[]>([]);
  const [dmLoading, setDmLoading] = useState(true);
  const [dmSearch, setDmSearch] = useState("");

  // --- Notification prompt ---
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<{ userId: string; name: string; image: string; role: string }[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Persist tab
  useEffect(() => {
    sessionStorage.setItem("vibechckd-inbox-tab", activeTab);
  }, [activeTab]);

  // Load persisted read timestamps
  useEffect(() => {
    const saved = localStorage.getItem("vibechckd-inbox-read");
    if (saved) {
      try {
        setLastRead(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Notification prompt on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return;
    const prompted = localStorage.getItem("vibechckd-notif-prompted");
    if (!prompted && Notification.permission === "default") {
      const timer = setTimeout(() => setShowNotifPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // --- Fetch project conversations ---
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      const active = data.filter(
        (c) => c.status !== "completed" && c.status !== "cancelled"
      );
      setConversations(active);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // --- Fetch DM threads ---
  const fetchDMThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/threads");
      if (!res.ok) return;
      const data: DMThread[] = await res.json();
      setDmThreads(data);
    } catch {
      // silently fail
    } finally {
      setDmLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "messages") {
      fetchDMThreads();
    }
  }, [activeTab, fetchDMThreads]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    const interval = setInterval(fetchDMThreads, 10000);
    return () => clearInterval(interval);
  }, [activeTab, fetchDMThreads]);

  // --- Handlers ---

  const handleSelectProject = (projectId: string) => {
    setSelected(projectId);
    const conv = conversations.find((c) => c.projectId === projectId);
    if (conv?.lastMessageAt) {
      setLastRead((prev) => {
        const updated = { ...prev, [projectId]: conv.lastMessageAt };
        localStorage.setItem("vibechckd-inbox-read", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const isUnread = (conv: Conversation) => {
    if (!conv.lastMessageAt) return false;
    const readAt = lastRead[conv.projectId];
    if (!readAt) return true;
    return new Date(conv.lastMessageAt) > new Date(readAt);
  };

  const handleArchive = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.projectId !== projectId));
        if (selected === projectId) setSelected(null);
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.projectId !== projectId));
        if (selected === projectId) setSelected(null);
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleNewMessage = () => {
    toast("User search coming soon");
  };

  // --- Derived data ---

  const selectedConv = conversations.find((c) => c.projectId === selected);
  const selectedDmThread = dmThreads.find((t) => t.id === selectedThread);

  const filteredConversations = search.trim()
    ? conversations.filter((c) =>
        c.projectName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const filteredDmThreads = dmSearch.trim()
    ? dmThreads.filter((t) =>
        t.otherUserName.toLowerCase().includes(dmSearch.toLowerCase())
      )
    : dmThreads;

  const tabs: { key: InboxTab; label: string }[] = [
    { key: "projects", label: "Projects" },
    { key: "messages", label: "Messages" },
  ];

  // Whether a chat panel is active (for mobile full-screen behavior)
  const hasChatOpen = activeTab === "projects" ? !!selected : !!selectedThread;

  return (
    <div className="flex h-[calc(100vh-48px)] md:h-screen">
      {/* Sidebar / conversation list */}
      <div className={`${hasChatOpen ? "hidden md:flex" : "flex"} w-full md:w-[280px] border-r-0 md:border-r border-border flex-shrink-0 flex-col h-full bg-background`}>
        {/* Header */}
        <div className="px-4 pt-4 md:pt-5 pb-2 flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Inbox
          </h1>
          <InboxMenu onOpenContacts={() => {
            setShowContacts(true);
            setContactsLoading(true);
            fetch("/api/dm/contacts")
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => setContacts(data))
              .catch(() => setContacts([]))
              .finally(() => setContactsLoading(false));
          }} />
        </div>

        {/* Segmented control */}
        <div className="px-3 pt-1 pb-1.5">
          <div className="inline-flex bg-surface-muted rounded-lg p-0.5 w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key === "projects") setSelectedThread(null);
                  if (tab.key === "messages") setSelected(null);
                }}
                className={`relative flex-1 px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                  activeTab === tab.key
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="inbox-tab"
                    className="absolute inset-0 bg-background border border-border rounded-md"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-1.5 border-b border-border">
          <div className="flex items-center gap-2 bg-surface-muted rounded-md px-2.5 py-1.5">
            <span className="text-text-muted flex-shrink-0">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={activeTab === "projects" ? search : dmSearch}
              onChange={(e) => {
                if (activeTab === "projects") setSearch(e.target.value);
                else setDmSearch(e.target.value);
              }}
              placeholder={activeTab === "projects" ? "Search projects" : "Search messages"}
              className="flex-1 text-[12px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {/* ---------- Projects Tab ---------- */}
          {activeTab === "projects" && (
            <>
              {isLoading && (
                <div className="px-4 py-6 text-center">
                  <span className="text-[12px] text-text-muted font-mono">Loading...</span>
                </div>
              )}
              {!isLoading && filteredConversations.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <span className="text-[12px] text-text-muted font-body italic">
                    {search.trim()
                      ? "No conversations match your search"
                      : "No conversations yet"}
                  </span>
                </div>
              )}
              {filteredConversations.map((conv) => {
                const unread = isUnread(conv);
                const showActions = hoveredId === conv.projectId;
                const hasNoMessages = !conv.lastMessage;

                return (
                  <div
                    key={conv.projectId}
                    onClick={() => handleSelectProject(conv.projectId)}
                    onMouseEnter={() => setHoveredId(conv.projectId)}
                    onMouseLeave={() => setHoveredId(null)}
                    role="button"
                    tabIndex={0}
                    className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer relative ${
                      selected === conv.projectId
                        ? "bg-surface-muted"
                        : "bg-background hover:bg-surface-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a] flex-shrink-0" />
                        )}
                        <span
                          className={`text-[13px] font-body truncate ${
                            unread
                              ? "text-text-primary font-semibold"
                              : "text-text-primary font-medium"
                          }`}
                        >
                          {conv.projectName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {showActions && (
                          <>
                            <button
                              onClick={(e) => handleArchive(e, conv.projectId)}
                              disabled={actionLoading === conv.projectId}
                              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-neutral-200 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                              title="Archive"
                            >
                              <ArchiveIcon />
                            </button>
                            {hasNoMessages && (
                              <button
                                onClick={(e) => handleDelete(e, conv.projectId)}
                                disabled={actionLoading === conv.projectId}
                                className="p-1 rounded text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                                title="Delete"
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </>
                        )}
                        {!showActions && (
                          <span className="text-[11px] font-mono text-text-muted">
                            {conv.lastMessageAt ? relativeTimestamp(conv.lastMessageAt) : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-[12px] font-body truncate ${
                        unread ? "text-text-secondary" : "text-text-muted"
                      }`}
                    >
                      {conv.lastMessage || "No messages yet"}
                    </p>
                  </div>
                );
              })}
            </>
          )}

          {/* ---------- Messages Tab ---------- */}
          {activeTab === "messages" && (
            <>
              {/* New message button */}
              <div className="px-3 py-2 border-b border-border">
                <button
                  onClick={handleNewMessage}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-primary border border-border rounded-md hover:bg-surface-muted transition-colors cursor-pointer w-full justify-center"
                >
                  <PlusIcon />
                  New message
                </button>
              </div>

              {dmLoading && (
                <div className="px-4 py-6 text-center">
                  <span className="text-[12px] text-text-muted font-mono">Loading...</span>
                </div>
              )}
              {!dmLoading && filteredDmThreads.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <span className="text-[12px] text-text-muted font-body italic">
                    {dmSearch.trim()
                      ? "No conversations match your search"
                      : "No direct messages yet"}
                  </span>
                </div>
              )}
              {filteredDmThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer ${
                    selectedThread === thread.id
                      ? "bg-surface-muted"
                      : "bg-background hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-surface-muted flex-shrink-0 flex items-center justify-center text-[12px] font-medium text-text-muted overflow-hidden">
                      {thread.otherUserAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thread.otherUserAvatar} alt={thread.otherUserName} className="w-full h-full object-cover" />
                      ) : (
                        (thread.otherUserName || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[13px] font-medium text-text-primary font-body truncate">
                          {thread.otherUserName}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted flex-shrink-0 ml-2">
                          {thread.lastMessageAt ? relativeTimestamp(thread.lastMessageAt) : ""}
                        </span>
                      </div>
                      <p className="text-[12px] font-body text-text-muted truncate">
                        {thread.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`${hasChatOpen ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {/* ---------- Project Chat ---------- */}
        {activeTab === "projects" && selectedConv && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Chat header with back + open project */}
            <div className="flex items-center gap-2 px-4 h-[44px] border-b border-border flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden flex items-center gap-1 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px]"
              >
                <BackIcon />
                Back
              </button>
              <span className="text-[13px] font-medium text-text-primary truncate flex-1 md:text-left text-center">
                {selectedConv.projectName}
              </span>
              <button
                onClick={() => router.push(`/dashboard/projects/${selectedConv.projectId}`)}
                className="flex items-center gap-1.5 px-2 py-1 text-[12px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-md hover:bg-surface-muted flex-shrink-0"
                title="Open project"
              >
                <span className="hidden sm:inline">Open project</span>
                <ExternalLinkIcon />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ProjectChat projectId={selectedConv.projectId} />
            </div>
          </div>
        )}

        {/* ---------- DM Chat ---------- */}
        {activeTab === "messages" && selectedDmThread && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* DM header */}
            <div className="flex items-center gap-2 px-4 h-[44px] border-b border-border flex-shrink-0">
              <button
                onClick={() => setSelectedThread(null)}
                className="md:hidden flex items-center gap-1 text-[13px] text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px]"
              >
                <BackIcon />
                Back
              </button>
              <div className="w-7 h-7 rounded-full bg-surface-muted flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-text-muted overflow-hidden">
                {selectedDmThread.otherUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedDmThread.otherUserAvatar} alt={selectedDmThread.otherUserName} className="w-full h-full object-cover" />
                ) : (
                  (selectedDmThread.otherUserName || "?").charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-[13px] font-medium text-text-primary truncate flex-1">
                {selectedDmThread.otherUserName}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <DMChat threadId={selectedDmThread.id} otherUserName={selectedDmThread.otherUserName} />
            </div>
          </div>
        )}

        {/* ---------- Quick-pick: recent conversations ---------- */}
        {!hasChatOpen && (
          <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
            {/* Background GIF */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-[0.04]"
              style={{ backgroundImage: "url('https://mir-s3-cdn-cf.behance.net/project_modules/source/c560dd40693289.57890a5289475.gif')" }}
            />
            <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
              <div className="w-full max-w-[400px]">
                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-4">
                  Pick up where you left off:
                </p>

                {activeTab === "projects" && conversations.length > 0 && (
                  <div className="space-y-2">
                    {conversations.slice(0, 2).map((convo) => (
                      <RecentProjectCard
                        key={convo.projectId}
                        convo={convo}
                        onClick={() => setSelected(convo.projectId)}
                      />
                    ))}
                  </div>
                )}

                {activeTab === "messages" && dmThreads.length > 0 && (
                  <div className="space-y-2">
                    {dmThreads.slice(0, 2).map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThread(thread.id)}
                        className="w-full text-left bg-background/80 backdrop-blur-sm border border-white/60 rounded-[10px] p-4 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:border-white/80 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted flex-shrink-0 overflow-hidden">
                            {thread.otherUserAvatar ? (
                              <img src={thread.otherUserAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (thread.otherUserName || "?").charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-[14px] font-medium text-text-primary truncate">{thread.otherUserName}</span>
                          <span className="text-[10px] font-mono text-text-muted flex-shrink-0 ml-auto">
                            {relativeTimestamp(thread.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-[12px] text-text-muted truncate pl-11">{thread.lastMessage}</p>
                      </button>
                    ))}
                  </div>
                )}

                {((activeTab === "projects" && conversations.length === 0) ||
                  (activeTab === "messages" && dmThreads.length === 0)) && (
                  <div className="flex flex-col items-center py-8">
                    <ChatBubbleIcon />
                    <span className="text-[13px] text-text-muted mt-3">
                      {activeTab === "projects" ? "No conversations yet" : "No messages yet"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contacts panel */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowContacts(false)} />
          <div className="relative w-full max-w-[340px] bg-background border-l border-border h-full flex flex-col animate-[slideInRight_0.2s_ease-out]">
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-text-primary">Contacts</h2>
              <button onClick={() => setShowContacts(false)} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-4 py-2 border-b border-border">
              <div className="flex items-center gap-2 bg-surface-muted rounded-md px-2.5 py-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="flex-1 text-[12px] text-text-primary placeholder:text-text-muted bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-surface-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-text-muted">No contacts found</div>
              ) : (
                <div className="py-1">
                  {contacts
                    .filter((c) => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                    .map((contact) => (
                    <button
                      key={contact.userId}
                      onClick={async () => {
                        // Create or find DM thread with this contact
                        try {
                          const res = await fetch("/api/dm/threads", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ recipientId: contact.userId }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setActiveTab("messages");
                            setSelectedThread(data.threadId);
                            setShowContacts(false);
                            // Refresh DM threads
                            fetch("/api/dm/threads")
                              .then((r) => (r.ok ? r.json() : []))
                              .then((threads) => setDmThreads(threads))
                              .catch(() => {});
                          }
                        } catch {
                          toast("Failed to start conversation");
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-[12px] font-medium text-text-muted overflow-hidden flex-shrink-0">
                        {contact.image ? (
                          <img src={contact.image} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          contact.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[13px] font-medium text-text-primary truncate">{contact.name}</p>
                        <p className="text-[10px] text-text-muted">{contact.role}</p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification prompt */}
      {showNotifPrompt && (
        <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />
      )}
    </div>
  );
}
