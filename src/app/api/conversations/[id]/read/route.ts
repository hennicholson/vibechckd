import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { conversationParticipants } from "@/db/schema";
import { isConversationMember } from "@/lib/conversation-access";
import { publishConversationEvent } from "@/lib/conversation-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mark a conversation as read up to "now" for the calling user. The inbox
// list's unread badge is computed from `lastReadAt` vs message timestamps,
// so updating here drops the count to zero immediately.
//
// Fans out a `read` event so the sender's UI can show a read receipt
// without polling.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: conversationId } = await ctx.params;
  if (!(await isConversationMember(session.user.id, conversationId))) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const lastReadAt = new Date();
  await db
    .update(conversationParticipants)
    .set({ lastReadAt })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, session.user.id)
      )
    );

  publishConversationEvent({
    type: "read",
    userId: session.user.id,
    conversationId,
    lastReadAt: lastReadAt.toISOString(),
  });

  return NextResponse.json({ ok: true, lastReadAt });
}
