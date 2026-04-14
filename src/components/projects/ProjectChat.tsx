"use client";

import { useState, useRef, useEffect } from "react";
import Button from "../Button";

// --- Types ---

type MessageType = "text" | "file" | "system" | "ai";

interface ChatMessage {
  id: string;
  sender: string;
  initial: string;
  content: string;
  timestamp: string;
  type: MessageType;
  fileName?: string;
  fileSize?: string;
}

// --- Mock Data ---

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "",
    initial: "",
    content: "Sara Chen joined the project",
    timestamp: "10:02 AM",
    type: "system",
  },
  {
    id: "m2",
    sender: "Sara Chen",
    initial: "SC",
    content:
      "Hey team, I just pushed the initial component structure. Let me know if the file organization makes sense.",
    timestamp: "10:05 AM",
    type: "text",
  },
  {
    id: "m3",
    sender: "Client",
    initial: "CL",
    content:
      "Looks great. Can we make sure the nav collapses on mobile? That was a pain point on the last project.",
    timestamp: "10:08 AM",
    type: "text",
  },
  {
    id: "m4",
    sender: "Marcus Johnson",
    initial: "MJ",
    content:
      "Already on it. I'm using a sheet pattern for mobile nav — swipe to dismiss. Should feel native.",
    timestamp: "10:12 AM",
    type: "text",
  },
  {
    id: "m5",
    sender: "Sara Chen",
    initial: "SC",
    content: "",
    timestamp: "10:15 AM",
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
    type: "ai",
  },
  {
    id: "m7",
    sender: "Client",
    initial: "CL",
    content: "That breakdown works. Let's aim for end of week for a first review.",
    timestamp: "10:22 AM",
    type: "text",
  },
  {
    id: "m8",
    sender: "Marcus Johnson",
    initial: "MJ",
    content:
      "Quick question — are we using the existing auth provider or rolling our own? That affects the timeline.",
    timestamp: "10:30 AM",
    type: "text",
  },
  {
    id: "m9",
    sender: "",
    initial: "",
    content: "Marcus Johnson shared a screen recording",
    timestamp: "10:45 AM",
    type: "system",
  },
  {
    id: "m10",
    sender: "Sara Chen",
    initial: "SC",
    content:
      "Nice work on the transitions, Marcus. The easing feels right. I'd tweak the duration on the card entrance — maybe 200ms instead of 300ms.",
    timestamp: "10:52 AM",
    type: "text",
  },
];

const MEMBER_COUNT = 3;

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

// --- Component ---

interface ProjectChatProps {
  projectId: string;
}

export default function ProjectChat({ projectId }: ProjectChatProps) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // keep projectId for future use
  void projectId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    inputRef.current?.focus();
  }

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
          onClick={() => setAiEnabled((v) => !v)}
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-[12px] italic text-text-muted font-body">
                  {msg.content}
                </span>
              </div>
            );
          }

          const isOwn = msg.sender === "Client";
          const isAi = msg.type === "ai";

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
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
                {isAi ? "AI" : msg.initial}
              </div>

              {/* Content */}
              <div
                className={`
                  max-w-[75%] min-w-0
                  ${isOwn ? "items-end" : "items-start"}
                `}
              >
                {/* Sender + time */}
                <div
                  className={`flex items-center gap-2 mb-0.5 ${
                    isOwn ? "flex-row-reverse" : ""
                  }`}
                >
                  <span className="text-[12px] font-medium text-text-primary font-body">
                    {msg.sender}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {msg.timestamp}
                  </span>
                </div>

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
                      ${isAi ? "bg-background-alt border border-border" : ""}
                      ${isOwn && !isAi ? "bg-surface-muted" : ""}
                      ${!isOwn && !isAi ? "bg-background" : ""}
                    `}
                  >
                    {isAi && (
                      <span className="inline-block text-[10px] font-mono text-text-muted bg-surface-muted rounded px-1 py-px mb-1.5">
                        AI
                      </span>
                    )}
                    {isAi && <br />}
                    {msg.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-3 py-2.5 bg-background shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          <button
            className="flex-shrink-0 p-1.5 text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer rounded"
            aria-label="Attach file"
          >
            <PaperclipIcon />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 text-[14px] font-body text-text-primary placeholder:text-text-muted bg-transparent outline-none"
          />
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
