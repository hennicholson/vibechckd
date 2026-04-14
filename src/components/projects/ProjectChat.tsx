"use client";

import { useState, useRef, useEffect } from "react";
import Button from "../Button";
import { useToast } from "../Toast";

// --- Types ---

type MessageType = "text" | "file" | "system" | "ai";

interface ChatMessage {
  id: string;
  sender: string;
  initial: string;
  content: string;
  timestamp: string;
  /** ISO timestamp for relative time calculation */
  sentAt: number;
  type: MessageType;
  fileName?: string;
  fileSize?: string;
}

// --- Relative time helper ---

function relativeTime(sentAt: number): string {
  const now = Date.now();
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

// --- Mock Data ---

const NOW = Date.now();

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "",
    initial: "",
    content: "Sara Chen joined the project",
    timestamp: "10:02 AM",
    sentAt: NOW - 3 * 60 * 60 * 1000,
    type: "system",
  },
  {
    id: "m2",
    sender: "Sara Chen",
    initial: "SC",
    content:
      "Hey team, I just pushed the initial component structure. Let me know if the file organization makes sense.",
    timestamp: "10:05 AM",
    sentAt: NOW - 2.9 * 60 * 60 * 1000,
    type: "text",
  },
  {
    id: "m3",
    sender: "Client",
    initial: "CL",
    content:
      "Looks great. Can we make sure the nav collapses on mobile? That was a pain point on the last project.",
    timestamp: "10:08 AM",
    sentAt: NOW - 2.7 * 60 * 60 * 1000,
    type: "text",
  },
  {
    id: "m4",
    sender: "Marcus Johnson",
    initial: "MJ",
    content:
      "Already on it. I'm using a sheet pattern for mobile nav — swipe to dismiss. Should feel native.",
    timestamp: "10:12 AM",
    sentAt: NOW - 2.5 * 60 * 60 * 1000,
    type: "text",
  },
  {
    id: "m5",
    sender: "Sara Chen",
    initial: "SC",
    content: "",
    timestamp: "10:15 AM",
    sentAt: NOW - 2.3 * 60 * 60 * 1000,
    type: "file",
    fileName: "design-system-tokens.json",
    fileSize: "4.2 KB",
  },
  {
    id: "m6",
    sender: "vibechckd AI",
    initial: "AI",
    content:
      "Based on the project scope, here's a suggested task breakdown:\n\n1. Navigation component (mobile + desktop) — Sara\n2. API integration layer + auth flow — Marcus\n3. Dashboard layout with responsive grid — Sara\n4. Data fetching hooks + caching — Marcus\n\nEstimated timeline: 5-7 days for MVP.",
    timestamp: "10:18 AM",
    sentAt: NOW - 2.1 * 60 * 60 * 1000,
    type: "ai",
  },
  {
    id: "m7",
    sender: "Client",
    initial: "CL",
    content: "That breakdown works. Let's aim for end of week for a first review.",
    timestamp: "10:22 AM",
    sentAt: NOW - 1.8 * 60 * 60 * 1000,
    type: "text",
  },
  {
    id: "m8",
    sender: "Marcus Johnson",
    initial: "MJ",
    content:
      "Quick question — are we using the existing auth provider or rolling our own? That affects the timeline.",
    timestamp: "10:30 AM",
    sentAt: NOW - 1.2 * 60 * 60 * 1000,
    type: "text",
  },
  {
    id: "m9",
    sender: "",
    initial: "",
    content: "Marcus Johnson shared a screen recording",
    timestamp: "10:45 AM",
    sentAt: NOW - 30 * 60 * 1000,
    type: "system",
  },
  {
    id: "m10",
    sender: "Sara Chen",
    initial: "SC",
    content:
      "Nice work on the transitions, Marcus. The easing feels right. I'd tweak the duration on the card entrance — maybe 200ms instead of 300ms.",
    timestamp: "10:52 AM",
    sentAt: NOW - 8 * 60 * 1000,
    type: "text",
  },
];

const MEMBER_COUNT = 3;
const MAX_CHARS = 500;

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
  const [aiEnabled, setAiEnabled] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // keep projectId for future use
  void projectId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  function handleToggleAi() {
    const next = !aiEnabled;
    setAiEnabled(next);
    toast(next ? "AI assistant enabled" : "AI assistant disabled");
  }

  function handleAttach() {
    toast("File attachment coming soon");
  }

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;

    const newMessage: ChatMessage = {
      id: `m${Date.now()}`,
      sender: "Client",
      initial: "CL",
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      sentAt: Date.now(),
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    inputRef.current?.focus();
    toast("Message sent");

    // Simulate AI typing response
    if (aiEnabled) {
      setIsAiTyping(true);
      setTimeout(() => {
        setIsAiTyping(false);
        const aiReply: ChatMessage = {
          id: `m${Date.now()}-ai`,
          sender: "vibechckd AI",
          initial: "AI",
          content: "Got it. I'll factor that into the current sprint plan.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
          sentAt: Date.now(),
          type: "ai",
        };
        setMessages((prev) => [...prev, aiReply]);
      }, 2000);
    }
  }

  const charCount = inputValue.length;

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-text-primary font-body">
            Chat
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-text-muted bg-surface-muted rounded">
            {MEMBER_COUNT}
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
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isSameSenderAsPrev =
            prevMsg &&
            prevMsg.type !== "system" &&
            msg.type !== "system" &&
            prevMsg.sender === msg.sender;
          const isDifferentSender = prevMsg && !isSameSenderAsPrev;

          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center py-3">
                <span className="text-[12px] italic text-text-muted font-body">
                  {msg.content}
                </span>
              </div>
            );
          }

          const isOwn = msg.sender === "Client";
          const isAi = msg.type === "ai";
          const showHeader = !isSameSenderAsPrev;

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
                {/* Avatar — only show on first message in a group */}
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
                    {isAi ? <BotIcon /> : msg.initial}
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
                  {/* Sender + time — only on first in group */}
                  {showHeader && (
                    <div
                      className={`flex items-center gap-2 mb-0.5 ${
                        isOwn ? "flex-row-reverse" : ""
                      }`}
                    >
                      <span className="text-[12px] font-medium text-text-primary font-body">
                        {msg.sender}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        {relativeTime(msg.sentAt)}
                      </span>
                    </div>
                  )}

                  {/* Message body */}
                  {msg.type === "file" ? (
                    <div
                      className={`
                        border border-border rounded-md px-3 py-2 flex items-center gap-2.5
                        ${isOwn ? "bg-surface-muted" : "bg-background"}
                      `}
                    >
                      <span className="text-text-muted">
                        <FileIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-text-primary font-body truncate">
                          {msg.fileName}
                        </div>
                        <div className="text-[11px] font-mono text-text-muted">
                          {msg.fileSize}
                        </div>
                      </div>
                      <span className="text-[12px] text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer font-body">
                        Download
                      </span>
                    </div>
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
        {isAiTyping && <div className="mt-2"><TypingIndicator /></div>}
        <div ref={messagesEndRef} />
      </div>

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
            disabled={!inputValue.trim()}
            className="!px-2.5 !py-1.5"
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
