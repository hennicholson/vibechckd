// Shared membership gate for conversation API routes. Returns true iff
// the user has an active (non-`leftAt`) participant record in the
// conversation. Centralized so every chat surface enforces the same
// rule without copy-paste.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { conversationParticipants } from "@/db/schema";

export async function isConversationMember(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        isNull(conversationParticipants.leftAt)
      )
    )
    .limit(1);
  return !!row;
}
