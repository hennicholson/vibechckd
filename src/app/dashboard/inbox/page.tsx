"use client";

import { useState, useEffect, useCallback } from "react";
import ProjectChat from "@/components/projects/ProjectChat";

type Conversation = {
  projectId: string;
  projectName: string;
  lastMessage: string;
  lastSenderName: string;
  lastMessageAt: string;
  status?: string;
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
      className="text-neutral-300"
    >
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

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Track last read timestamps per project (stored in memory for this session)
  const [lastRead, setLastRead] = useState<Record<string, string>>({});

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data: Conversation[] = await res.json();
      // Filter out completed/cancelled projects
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

  // Refresh conversation list every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Mark as read when selecting a conversation
  const handleSelect = (projectId: string) => {
    setSelected(projectId);
    const conv = conversations.find((c) => c.projectId === projectId);
    if (conv?.lastMessageAt) {
      setLastRead((prev) => ({ ...prev, [projectId]: conv.lastMessageAt }));
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
        setConversations((prev) =>
          prev.filter((c) => c.projectId !== projectId)
        );
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
        setConversations((prev) =>
          prev.filter((c) => c.projectId !== projectId)
        );
        if (selected === projectId) setSelected(null);
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const selectedConv = conversations.find((c) => c.projectId === selected);

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.projectName.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex h-screen">
      {/* Conversation list */}
      <div className="w-[280px] border-r border-[#e5e5e5] flex-shrink-0 flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-4 h-[48px] flex items-center border-b border-[#e5e5e5]">
          <span className="text-[14px] font-medium text-[#0a0a0a] font-body">
            Inbox
          </span>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[#e5e5e5]">
          <div className="flex items-center gap-2 bg-neutral-50 rounded-md px-2.5 py-1.5">
            <span className="text-neutral-400 flex-shrink-0">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="flex-1 text-[12px] font-body text-[#0a0a0a] placeholder:text-neutral-400 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-6 text-center">
              <span className="text-[12px] text-neutral-400 font-mono">
                Loading...
              </span>
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <span className="text-[12px] text-neutral-500 font-body italic">
                {search.trim()
                  ? "No conversations match your search"
                  : "No conversations yet"}
              </span>
            </div>
          )}
          {filtered.map((conv) => {
            const unread = isUnread(conv);
            const showActions = hoveredId === conv.projectId;
            const hasNoMessages = !conv.lastMessage;

            return (
              <button
                key={conv.projectId}
                onClick={() => handleSelect(conv.projectId)}
                onMouseEnter={() => setHoveredId(conv.projectId)}
                onMouseLeave={() => setHoveredId(null)}
                className={`w-full text-left px-4 py-3 border-b border-[#e5e5e5] transition-colors duration-150 cursor-pointer relative ${
                  selected === conv.projectId
                    ? "bg-neutral-50"
                    : "bg-white hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Unread dot */}
                    {unread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0a] flex-shrink-0" />
                    )}
                    <span
                      className={`text-[13px] font-body truncate ${
                        unread
                          ? "text-[#0a0a0a] font-semibold"
                          : "text-[#0a0a0a] font-medium"
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
                          className="p-1 rounded text-neutral-400 hover:text-[#0a0a0a] hover:bg-neutral-200 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                          title="Archive"
                        >
                          <ArchiveIcon />
                        </button>
                        {hasNoMessages && (
                          <button
                            onClick={(e) => handleDelete(e, conv.projectId)}
                            disabled={actionLoading === conv.projectId}
                            className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer disabled:opacity-40"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </>
                    )}
                    {!showActions && (
                      <span className="text-[11px] font-mono text-neutral-400">
                        {conv.lastMessageAt
                          ? relativeTimestamp(conv.lastMessageAt)
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className={`text-[12px] font-body truncate ${
                    unread ? "text-neutral-600" : "text-neutral-400"
                  }`}
                >
                  {conv.lastMessage || "No messages yet"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selectedConv ? (
          <div className="flex-1 min-h-0">
            <ProjectChat projectId={selectedConv.projectId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white">
            <ChatBubbleIcon />
            <span className="text-[13px] text-neutral-500 font-body">
              Select a conversation to view messages
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
