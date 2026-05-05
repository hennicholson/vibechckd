import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight endpoint that returns just the total number of unread
// messages across the current user's conversations. Used by the sidebar
// inbox indicator + the floating quick-chat button so they don't have
// to fetch the full conversations payload (which is ~10–50KB) just to
// render a 6×6 dot.
//
// "Unread" = a message in a conversation the user is a non-left
// participant of, sent by someone else, with `created_at` newer than
// the user's `conversationParticipants.lastReadAt`. Mirrors the
// per-conversation calc in /api/conversations.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ count: 0 });
  }
  const userId = session.user.id;

  const result = (await db.execute(sql`
    SELECT COUNT(*)::int AS "count"
    FROM "messages" m
    JOIN "conversation_participants" cp
      ON cp."conversation_id" = m."conversation_id"
     AND cp."user_id" = ${userId}
     AND cp."left_at" IS NULL
    WHERE m."sender_id" <> ${userId}
      AND (cp."last_read_at" IS NULL OR m."created_at" > cp."last_read_at")
  `)) as unknown as { rows: Array<{ count: number }> };

  const count = result.rows?.[0]?.count ?? 0;
  return Response.json({ count });
}
