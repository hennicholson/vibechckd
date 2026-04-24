import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { messages, users, projectMembers } from "@/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { parseBody, z } from "@/lib/validation";

const messagePostSchema = z
  .object({
    projectId: z.string().uuid(),
    content: z.string().min(1).max(10_000),
    messageType: z
      .enum(["text", "file", "system", "ai"])
      .optional(),
    fileUrl: z.string().url().max(2048).nullable().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return Response.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  // Pagination: ?limit=N (default 50, cap 100) and ?cursor=<messageId>
  // Cursor semantics: return messages created strictly before the cursor
  // message's createdAt. Ordering is DESC (newest first).
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
  const cursor = searchParams.get("cursor");

  // SECURITY: Verify the requesting user is a member of this project
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // If a cursor was supplied, fetch that message's createdAt to anchor the
  // window. Missing/invalid cursors degrade gracefully (ignored).
  let cursorAt: Date | null = null;
  if (cursor) {
    const [cursorMsg] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, cursor))
      .limit(1);
    if (cursorMsg) cursorAt = cursorMsg.createdAt;
  }

  const where = cursorAt
    ? and(eq(messages.projectId, projectId), lt(messages.createdAt, cursorAt))
    : eq(messages.projectId, projectId);

  const rows = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      senderId: messages.senderId,
      content: messages.content,
      messageType: messages.messageType,
      fileUrl: messages.fileUrl,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(where)
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(messagePostSchema, rawBody);
  if (!parsed.ok) {
    return Response.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { projectId, content, messageType, fileUrl } = parsed.data;

  // SECURITY: Verify the requesting user is a member of this project
  const [postMembership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (!postMembership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [created] = await db
    .insert(messages)
    .values({
      projectId,
      senderId: session.user.id,
      content,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
    })
    .returning();

  // Return with sender name
  return Response.json({
    ...created,
    senderName: session.user.name || "Unknown",
  });
}
