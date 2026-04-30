"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Throttled typing ping. Call `pingTyping()` from the composer's onChange.
// Fires POST /api/conversations/[id]/typing at most every `intervalMs`
// (default 3s) to avoid spamming the bus while the user types continuously.
//
// Receivers wire `onPeerTyping` into their `useConversationStream` handler;
// the hook auto-clears the indicator after `clearAfterMs` (default 5s).
export function useTypingIndicator(
  conversationId: string | null,
  intervalMs = 3000,
  clearAfterMs = 5000
) {
  const lastPingRef = useRef(0);
  const [typingPeer, setTypingPeerState] = useState<{
    userId: string;
    name: string | null;
  } | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pingTyping = useCallback(() => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastPingRef.current < intervalMs) return;
    lastPingRef.current = now;
    fetch(`/api/conversations/${conversationId}/typing`, {
      method: "POST",
    }).catch(() => {});
  }, [conversationId, intervalMs]);

  const onPeerTyping = useCallback(
    (e: { userId: string; userName: string | null }) => {
      setTypingPeerState({ userId: e.userId, name: e.userName });
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setTypingPeerState(null);
      }, clearAfterMs);
    },
    [clearAfterMs]
  );

  useEffect(() => () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
  }, []);

  return { pingTyping, typingPeer, onPeerTyping };
}
