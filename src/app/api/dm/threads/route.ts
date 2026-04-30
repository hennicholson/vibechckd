import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  conversations,
  conversationParticipants,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Thin shim — preserves the legacy /api/dm/threads response shape so the
// inbox UI keeps working unchanged. Reads/writes flow through the unified
// `conversations` + `conversation_participants` tables. The old N+1
// (one query per thread for participants and last message) is replaced
// with a single SQL using LATERAL JOINs against the new schema.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const result = (await db.execute(sql`
    SELECT
      c."id" AS "threadId",
      ps."participants",
      lm."content" AS "lastMessage",
      lm."created_at" AS "lastMessageAt"
    FROM "conversations" c
    JOIN "conversation_participants" cp
      ON cp."conversation_id" = c."id"
     AND cp."user_id" = ${userId}
     AND cp."left_at" IS NULL
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object('userId', u."id", 'name', u."name", 'image', u."image")
      ) AS "participants"
      FROM "conversation_participants" cp2
      JOIN "users" u ON u."id" = cp2."user_id"
      WHERE cp2."conversation_id" = c."id"
        AND cp2."user_id" <> ${userId}
        AND cp2."left_at" IS NULL
    ) ps ON true
    LEFT JOIN LATERAL (
      SELECT m."content", m."created_at"
      FROM "messages" m
      WHERE m."conversation_id" = c."id"
      ORDER BY m."created_at" DESC
      LIMIT 1
    ) lm ON true
    WHERE c."kind" IN ('dm', 'job_application')
    ORDER BY COALESCE(lm."created_at", c."updated_at") DESC NULLS LAST
  `)) as unknown as {
    rows: Array<{
      threadId: string;
      participants: Array<{ userId: string; name: string | null; image: string | null }> | null;
      lastMessage: string | null;
      lastMessageAt: string | null;
    }>;
  };

  // db.execute() returns { rows, rowCount, ... } — pull rows explicitly.
  return Response.json(
    (result.rows ?? []).map((r) => ({
      threadId: r.threadId,
      participants: r.participants ?? [],
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const recipientId: string | undefined = body?.recipientId;
  if (!recipientId) {
    return Response.json({ error: "recipientId is required" }, { status: 400 });
  }
  if (recipientId === session.user.id) {
    return Response.json(
      { error: "Cannot create a DM thread with yourself" },
      { status: 400 }
    );
  }

  // Find an existing 1:1 dm conversation between exactly these two users.
  const existing = (await db.execute(sql`
    SELECT c."id"
    FROM "conversations" c
    WHERE c."kind" = 'dm'
      AND (
        SELECT COUNT(*) FROM "conversation_participants" cp
        WHERE cp."conversation_id" = c."id" AND cp."left_at" IS NULL
      ) = 2
      AND EXISTS (
        SELECT 1 FROM "conversation_participants" cpA
        WHERE cpA."conversation_id" = c."id" AND cpA."user_id" = ${session.user.id}
      )
      AND EXISTS (
        SELECT 1 FROM "conversation_participants" cpB
        WHERE cpB."conversation_id" = c."id" AND cpB."user_id" = ${recipientId}
      )
    LIMIT 1
  `)) as unknown as { rows: Array<{ id: string }> };

  if ((existing.rows?.length ?? 0) > 0) {
    return Response.json({ threadId: existing.rows[0].id });
  }

  const [conv] = await db
    .insert(conversations)
    .values({ kind: "dm" })
    .returning({ id: conversations.id });
  await db.insert(conversationParticipants).values([
    { conversationId: conv.id, userId: session.user.id },
    { conversationId: conv.id, userId: recipientId },
  ]);

  return Response.json({ threadId: conv.id });
}
