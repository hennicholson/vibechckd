"use client";

import { useState } from "react";
import ProjectChat from "@/components/projects/ProjectChat";

type Conversation = {
  id: string;
  projectId: string;
  projectName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
};

const conversations: Conversation[] = [
  {
    id: "conv-1",
    projectId: "proj-1",
    projectName: "vibechckd Marketing Site",
    lastMessage: "Nice work on the transitions, Marcus. The easing feels right.",
    timestamp: "2h ago",
    unreadCount: 2,
  },
  {
    id: "conv-2",
    projectId: "proj-3",
    projectName: "E-Commerce Redesign",
    lastMessage: "Can we revisit the checkout flow? Conversion is still below target.",
    timestamp: "Yesterday",
    unreadCount: 1,
  },
  {
    id: "conv-3",
    projectId: "proj-2",
    projectName: "Personal Portfolio",
    lastMessage: "Draft looks good. Let me know when you want to go live.",
    timestamp: "Apr 10",
    unreadCount: 0,
  },
  {
    id: "conv-4",
    projectId: "proj-4",
    projectName: "SaaS Dashboard",
    lastMessage: "The data visualization components are ready for review.",
    timestamp: "Apr 8",
    unreadCount: 0,
  },
  {
    id: "conv-5",
    projectId: "proj-5",
    projectName: "Mobile App Landing",
    lastMessage: "Updated the hero animation per your notes. Take a look?",
    timestamp: "Apr 5",
    unreadCount: 0,
  },
];

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

  const selectedConv = conversations.find((c) => c.id === selected);

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
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer ${
                selected === conv.id
                  ? "bg-surface-muted"
                  : "bg-background hover:bg-background-alt"
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {conv.unreadCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-text-primary flex-shrink-0" />
                  )}
                  <span
                    className={`text-[13px] text-text-primary font-body truncate ${
                      conv.unreadCount > 0 ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {conv.projectName}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-text-muted flex-shrink-0 ml-2">
                  {conv.timestamp}
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
