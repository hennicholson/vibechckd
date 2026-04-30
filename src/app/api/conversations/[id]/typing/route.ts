import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isConversationMember } from "@/lib/conversation-access";
import { publishConversationEvent } from "@/lib/conversation-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/conversations/[id]/typing — fires a single SSE `typing` event
// to other participants. The composer pings this every ~3s while the user
// is composing; viewers debounce the indicator client-side (clears after
// 5s of silence). No DB writes — the event is purely transient.
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

  publishConversationEvent({
    type: "typing",
    userId: session.user.id,
    userName: session.user.name ?? null,
    conversationId,
  });

  return NextResponse.json({ ok: true });
}
