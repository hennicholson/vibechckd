// In-process pub/sub for conversation events. Producers (POST message,
// webhook on invoice paid, read-receipt update) call `publish`; the SSE
// route handler holds an open `text/event-stream` per client and calls
// `subscribe` to fan out events back to listeners on the right
// conversation.
//
// This is deliberately in-process (no Redis / Pusher). On Netlify, each
// function invocation has its own runtime — the bus only fans out within
// a single process. SSE connections live in that same process for the
// lifetime of the connection, so a write from POST → fanout to readers
// works as long as both run in the same dyno. For the app's current
// scale (one process per region) that's acceptable; if we outgrow it,
// swap this module for a Redis pub/sub without changing call sites.

import { EventEmitter } from "node:events";

export type ConversationEvent =
  | { type: "message"; messageId: string; conversationId: string }
  | { type: "read"; userId: string; conversationId: string; lastReadAt: string }
  | { type: "invoice_status"; invoiceId: string; status: string; conversationId: string }
  | { type: "participant_added"; userId: string; conversationId: string }
  | { type: "kind_changed"; kind: "dm" | "project" | "job_application"; projectId: string | null; conversationId: string }
  | { type: "typing"; userId: string; userName: string | null; conversationId: string };

// Single global emitter shared across all imports. `Symbol.for` makes it
// survive HMR reloads in dev — without it, every code change spawns a new
// emitter and existing subscribers go deaf.
const KEY = Symbol.for("vibechckd.conversationBus");
type Globals = typeof globalThis & { [k: symbol]: EventEmitter | undefined };
const g = globalThis as Globals;
const emitter: EventEmitter = g[KEY] ??= (() => {
  const e = new EventEmitter();
  // EventEmitter defaults to 10 listeners — SSE clients are long-lived
  // and we expect dozens per conversation in the active set. Bump it.
  e.setMaxListeners(0);
  return e;
})();

function channel(conversationId: string): string {
  return `c:${conversationId}`;
}

export function publishConversationEvent(event: ConversationEvent): void {
  emitter.emit(channel(event.conversationId), event);
}

export function subscribeToConversation(
  conversationId: string,
  handler: (event: ConversationEvent) => void
): () => void {
  const ch = channel(conversationId);
  emitter.on(ch, handler);
  return () => emitter.off(ch, handler);
}
