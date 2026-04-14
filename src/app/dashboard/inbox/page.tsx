"use client";

import { useState, useEffect, useCallback } from "react";
import ProjectChat from "@/components/projects/ProjectChat";

type Conversation = {
  projectId: string;
  projectName: string;
  lastMessage: string;
  lastSenderName: string;
  lastMessageAt: string;
};

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

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#d4d4d4]"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      setConversations(data);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh conversation list every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selectedConv = conversations.find((c) => c.projectId === selected);

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.projectName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex h-screen">
      {/* Conversation list */}
      <div className="w-[280px] border-r border-border flex-shrink-0 flex flex-col h-full bg-background">
        {/* Header */}
        <div className="px-4 h-[48px] flex items-center border-b border-border">
          <span className="text-[14px] font-medium text-text-primary font-body">
            Inbox
          </span>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
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
              <span className="text-[12px] text-text-muted font-mono">
                Loading...
              </span>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <span className="text-[12px] text-text-muted font-body italic">
                {search.trim()
                  ? "No conversations match your search"
                  : "No conversations yet"}
              </span>
            </div>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.projectId}
              onClick={() => setSelected(conv.projectId)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer ${
                selected === conv.projectId
                  ? "bg-surface-muted"
                  : "bg-background hover:bg-background-alt"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[13px] text-text-primary font-body font-medium truncate">
                    {conv.projectName}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-text-muted flex-shrink-0 ml-2">
                  {conv.lastMessageAt
                    ? relativeTimestamp(conv.lastMessageAt)
                    : ""}
                </span>
              </div>
              <p className="text-[12px] text-text-muted font-body truncate">
                {conv.lastMessage}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedConv ? (
          <div className="flex-1 min-h-0">
            <ProjectChat projectId={selectedConv.projectId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <ChatBubbleIcon />
            <span className="text-[13px] text-text-muted font-body">
              Select a conversation to view messages
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
