import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List the current user's conversations across all kinds (project / dm /
// job_application). Single SQL query — no N+1 over participants or last
// messages. Each row carries:
//
//   - id, kind, projectId, jobApplicationId
//   - title  (computed: project.title | job.title | other DM participant's name)
//   - lastMessage{Content, Kind, At, SenderName}
//   - unreadCount (messages newer than my conversationParticipants.lastReadAt)
//   - participants[] (id, name, image) for the current user's view
//
// LATERAL JOINs do the per-row "last message" + "unread count" without
// nested-loop fanout. With the (conversation_id, created_at desc) index
// from migration 0012 these stay O(log n) per conversation.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const result = (await db.execute(sql`
    WITH my_conversations AS (
      SELECT c.*, cp."last_read_at" AS my_last_read_at
      FROM "conversations" c
      JOIN "conversation_participants" cp
        ON cp."conversation_id" = c."id"
       AND cp."user_id" = ${userId}
       AND cp."left_at" IS NULL
    )
    SELECT
      mc."id",
      mc."kind",
      mc."project_id" AS "projectId",
      mc."job_application_id" AS "jobApplicationId",
      mc."updated_at" AS "updatedAt",
      mc."my_last_read_at" AS "lastReadAt",
      -- Computed title: project.title | job.title | other-participant's name | conversation.title fallback
      COALESCE(
        mc."title",
        p."title",
        j."title",
        (
          SELECT u2."name"
          FROM "conversation_participants" cp2
          JOIN "users" u2 ON u2."id" = cp2."user_id"
          WHERE cp2."conversation_id" = mc."id"
            AND cp2."user_id" <> ${userId}
            AND cp2."left_at" IS NULL
          LIMIT 1
        )
      ) AS "title",
      lm."content" AS "lastMessageContent",
      lm."message_type" AS "lastMessageKind",
      lm."created_at" AS "lastMessageAt",
      lm."sender_name" AS "lastSenderName",
      uc."unread_count" AS "unreadCount",
      ps."participants"
    FROM my_conversations mc
    LEFT JOIN "projects" p ON p."id" = mc."project_id"
    LEFT JOIN "job_applications" ja ON ja."id" = mc."job_application_id"
    LEFT JOIN "jobs" j ON j."id" = ja."job_id"
    -- Last message (one per conversation)
    LEFT JOIN LATERAL (
      SELECT m."content", m."message_type", m."created_at", u."name" AS "sender_name"
      FROM "messages" m
      LEFT JOIN "users" u ON u."id" = m."sender_id"
      WHERE m."conversation_id" = mc."id"
      ORDER BY m."created_at" DESC
      LIMIT 1
    ) lm ON true
    -- Unread count for the current user
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "unread_count"
      FROM "messages" m
      WHERE m."conversation_id" = mc."id"
        AND m."sender_id" <> ${userId}
        AND (mc."my_last_read_at" IS NULL OR m."created_at" > mc."my_last_read_at")
    ) uc ON true
    -- Participants array (id, name, image) — small enough to inline
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object('id', u."id", 'name', u."name", 'image', u."image")
        ORDER BY u."name"
      ) AS "participants"
      FROM "conversation_participants" cp
      JOIN "users" u ON u."id" = cp."user_id"
      WHERE cp."conversation_id" = mc."id"
        AND cp."left_at" IS NULL
    ) ps ON true
    ORDER BY COALESCE(lm."created_at", mc."updated_at") DESC NULLS LAST
    LIMIT 200
  `)) as unknown as {
    rows: Array<{
      id: string;
      kind: "dm" | "project" | "job_application";
      projectId: string | null;
      jobApplicationId: string | null;
      updatedAt: string;
      lastReadAt: string | null;
      title: string | null;
      lastMessageContent: string | null;
      lastMessageKind: string | null;
      lastMessageAt: string | null;
      lastSenderName: string | null;
      unreadCount: number;
      participants: Array<{ id: string; name: string | null; image: string | null }> | null;
    }>;
  };

  // neon-http returns { rows, rowCount, ... } from db.execute() — pull rows
  // explicitly. Previous casts to a plain array were a lie that compiled
  // but blew up at runtime when the client tried to .find() / .map() on
  // the wrapper object.
  return Response.json({ conversations: result.rows ?? [] });
}
