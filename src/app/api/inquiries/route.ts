import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages, coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only clients can open inquiries. Previously this had no role check —
    // anyone (coder, admin) could call it. Admins are routed through their
    // own surfaces; coders shouldn't be opening "Inquiry to coder" drafts.
    const sessionRole = (session.user as { role?: string }).role;
    if (sessionRole !== "client" && sessionRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 20 inquiry creates per hour per user. Prevents draft-project spam.
    const rl = checkRateLimit(`inquiries:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many inquiries. Try again in a bit." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const coderId: unknown = body?.coderId;
    const type: unknown = body?.type;
    // SECURITY: coderName is intentionally IGNORED from the client body —
    // it was previously used verbatim as the roleLabel, allowing a caller
    // to pass `coderName: "client X"` and have the new member row appear
    // privileged in role-aware checks (PRIVILEGED_ROLES matches "client").

    if (typeof coderId !== "string" || coderId.length === 0) {
      return NextResponse.json({ error: "Missing coderId" }, { status: 400 });
    }

    // Resolve coder. coderId can be either coderProfiles.id or users.id.
    // The result MUST be an active coder profile — we don't open inquiries
    // against dormant or non-vetted users.
    const [profileRow] = await db
      .select({
        coderUserId: coderProfiles.userId,
        status: coderProfiles.status,
        coderName: users.name,
      })
      .from(coderProfiles)
      .innerJoin(users, eq(users.id, coderProfiles.userId))
      .where(eq(coderProfiles.id, coderId))
      .limit(1);

    let coderUserId: string | null = null;
    let resolvedCoderName: string | null = null;
    if (profileRow) {
      if (profileRow.status !== "active") {
        return NextResponse.json(
          { error: "This coder isn't accepting inquiries right now." },
          { status: 400 }
        );
      }
      coderUserId = profileRow.coderUserId;
      resolvedCoderName = profileRow.coderName;
    } else {
      // Fallback: coderId might be a users.id directly. Confirm an active
      // coderProfile exists for it.
      const [byUser] = await db
        .select({
          status: coderProfiles.status,
          coderName: users.name,
        })
        .from(coderProfiles)
        .innerJoin(users, eq(users.id, coderProfiles.userId))
        .where(eq(coderProfiles.userId, coderId))
        .limit(1);
      if (!byUser || byUser.status !== "active") {
        return NextResponse.json(
          { error: "Coder not found or not active." },
          { status: 404 }
        );
      }
      coderUserId = coderId;
      resolvedCoderName = byUser.coderName;
    }

    if (!coderUserId || !resolvedCoderName) {
      return NextResponse.json({ error: "Coder not found." }, { status: 404 });
    }

    const title =
      type === "project"
        ? `Project with ${resolvedCoderName}`
        : `Inquiry to ${resolvedCoderName}`;

    const messageContent =
      type === "project"
        ? `Hi ${resolvedCoderName}, I'd like to start a project with you.`
        : `Hi ${resolvedCoderName}, I'd like to learn more about working with you.`;

    // Create the project
    const [project] = await db
      .insert(projects)
      .values({
        title,
        description: `${type === "project" ? "Project" : "Inquiry"} initiated via vibechckd`,
        status: "draft",
      })
      .returning();

    // Add client as member with "Client" role (privileged for project edits)
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      roleLabel: "Client",
    });

    // Add coder as member with the canonical "Creator" role — NEVER use
    // client-supplied text here. PRIVILEGED_ROLES treats "client/lead/owner"
    // as privileged; allowing arbitrary roleLabel would let the caller
    // smuggle "client" into the coder's membership row.
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: coderUserId,
      roleLabel: "Creator",
    });

    // Send initial message
    await db.insert(messages).values({
      projectId: project.id,
      senderId: session.user.id,
      content: messageContent,
      messageType: "text",
    });

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error: any) {
    console.error("Inquiry error:", error?.message || error);
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}
