"use client";

import { useEffect, useRef } from "react";

// Strongly-typed event shapes — must match the server-side bus in
// src/lib/conversation-bus.ts.
type StreamEvent =
  | { type: "message"; messageId: string; conversationId: string }
  | { type: "read"; userId: string; conversationId: string; lastReadAt: string }
  | { type: "invoice_status"; invoiceId: string; status: string; conversationId: string }
  | { type: "participant_added"; userId: string; conversationId: string }
  | { type: "kind_changed"; kind: "dm" | "project" | "job_application"; projectId: string | null; conversationId: string }
  | { type: "typing"; userId: string; userName: string | null; conversationId: string };

export interface ConversationStreamHandlers {
  onMessage?: (e: Extract<StreamEvent, { type: "message" }>) => void;
  onRead?: (e: Extract<StreamEvent, { type: "read" }>) => void;
  onInvoiceStatus?: (e: Extract<StreamEvent, { type: "invoice_status" }>) => void;
  onParticipantAdded?: (e: Extract<StreamEvent, { type: "participant_added" }>) => void;
  onKindChanged?: (e: Extract<StreamEvent, { type: "kind_changed" }>) => void;
  onTyping?: (e: Extract<StreamEvent, { type: "typing" }>) => void;
}

// Subscribes to /api/conversations/{id}/stream and dispatches events to the
// supplied handlers. Auto-reconnects with backoff if the connection drops
// (which Netlify's idle timeout will inevitably cause). Falls back to
// polling-only if EventSource isn't available — caller is expected to
// also have its own polling layer; this hook just stays silent on
// unsupported environments rather than throwing.
export function useConversationStream(
  conversationId: string | null,
  handlers: ConversationStreamHandlers
) {
  // Stash handlers in a ref so the effect doesn't tear down + reconnect
  // every render when the parent passes inline closures.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!conversationId) return;
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 500; // ms; doubled on each failure up to 30s
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource(`/api/conversations/${conversationId}/stream`);

      es.addEventListener("message", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "message") handlersRef.current.onMessage?.(data);
        } catch {
          // ignore malformed frames
        }
      });
      es.addEventListener("read", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "read") handlersRef.current.onRead?.(data);
        } catch {}
      });
      es.addEventListener("invoice_status", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "invoice_status") handlersRef.current.onInvoiceStatus?.(data);
        } catch {}
      });
      es.addEventListener("participant_added", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "participant_added") handlersRef.current.onParticipantAdded?.(data);
        } catch {}
      });
      es.addEventListener("kind_changed", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "kind_changed") handlersRef.current.onKindChanged?.(data);
        } catch {}
      });
      es.addEventListener("typing", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as StreamEvent;
          if (data.type === "typing") handlersRef.current.onTyping?.(data);
        } catch {}
      });

      es.onopen = () => {
        backoff = 500; // reset on successful connect
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30_000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [conversationId]);
}
