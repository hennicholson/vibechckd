import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  conversations,
  conversationParticipants,
  users,
  projects,
  jobs,
  jobApplications,
} from "@/db/schema";
import { isConversationMember } from "@/lib/conversation-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET a single conversation + its participants + computed title +
// linked context (project / job). Used by the chat panel header and
// any view that opens directly to a conversation.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await isConversationMember(session.user.id, id))) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const [conv] = await db
    .select({
      id: conversations.id,
      kind: conversations.kind,
      projectId: conversations.projectId,
      jobApplicationId: conversations.jobApplicationId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const participants = await db
    .select({
      userId: users.id,
      name: users.name,
      image: users.image,
      lastReadAt: conversationParticipants.lastReadAt,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(conversationParticipants.userId, users.id))
    .where(
      and(
        eq(conversationParticipants.conversationId, id),
        isNull(conversationParticipants.leftAt)
      )
    );

  let projectTitle: string | null = null;
  let jobTitle: string | null = null;
  if (conv.projectId) {
    const [p] = await db
      .select({ title: projects.title })
      .from(projects)
      .where(eq(projects.id, conv.projectId))
      .limit(1);
    projectTitle = p?.title ?? null;
  }
  if (conv.jobApplicationId) {
    const [row] = await db
      .select({ title: jobs.title })
      .from(jobApplications)
      .innerJoin(jobs, eq(jobs.id, jobApplications.jobId))
      .where(eq(jobApplications.id, conv.jobApplicationId))
      .limit(1);
    jobTitle = row?.title ?? null;
  }

  // Title resolution mirrors the list endpoint: explicit > project > job >
  // other-participant name. Computed here so the client doesn't need to.
  const otherParticipant = participants.find((p) => p.userId !== session.user!.id);
  const resolvedTitle =
    conv.title ?? projectTitle ?? jobTitle ?? otherParticipant?.name ?? "Conversation";

  return NextResponse.json({
    ...conv,
    title: resolvedTitle,
    projectTitle,
    jobTitle,
    participants,
  });
}
