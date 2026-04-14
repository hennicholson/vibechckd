"use client";

import { useState } from "react";
import ProjectChat from "@/components/projects/ProjectChat";

type Conversation = {
  id: string;
  projectId: string;
  projectName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
};

const conversations: Conversation[] = [
  {
    id: "conv-1",
    projectId: "proj-1",
    projectName: "vibechckd Marketing Site",
    lastMessage: "Nice work on the transitions, Marcus. The easing feels right.",
    timestamp: "10:52 AM",
    unread: true,
  },
  {
    id: "conv-2",
    projectId: "proj-3",
    projectName: "E-Commerce Redesign",
    lastMessage: "Can we revisit the checkout flow? Conversion is still below target.",
    timestamp: "Yesterday",
    unread: false,
  },
  {
    id: "conv-3",
    projectId: "proj-2",
    projectName: "Personal Portfolio Site",
    lastMessage: "Draft looks good. Let me know when you want to go live.",
    timestamp: "Apr 11",
    unread: false,
  },
];

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>("conv-1");

  const selectedConv = conversations.find((c) => c.id === selected);

  return (
    <div className="flex h-screen">
      {/* Conversation list */}
      <div className="w-[260px] border-r border-border flex-shrink-0 flex flex-col h-full bg-background">
        {/* Header */}
        <div className="px-4 h-[48px] flex items-center border-b border-border">
          <span className="text-[14px] font-medium text-text-primary font-body">
            Inbox
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors duration-150 cursor-pointer ${
                selected === conv.id
                  ? "bg-surface-muted"
                  : "bg-background hover:bg-background-alt"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                {conv.unread && (
                  <span className="w-1.5 h-1.5 rounded-full bg-text-primary flex-shrink-0" />
                )}
                <span className="text-[13px] font-medium text-text-primary font-body truncate">
                  {conv.projectName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[12px] text-text-muted font-body truncate flex-1">
                  {conv.lastMessage}
                </p>
                <span className="text-[11px] font-mono text-text-muted flex-shrink-0">
                  {conv.timestamp}
                </span>
              </div>
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
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[13px] text-text-muted font-body">
              Select a conversation
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
