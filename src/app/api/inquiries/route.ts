import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages, coderProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { coderId, coderName, type } = await req.json();

    if (!coderId || !coderName) {
      return NextResponse.json({ error: "Missing coder info" }, { status: 400 });
    }

    // Look up the coder's actual user ID
    // coderId might be a coder_profiles.id or a users.id — try both
    let coderUserId = coderId;

    // Check if it's a coder_profiles.id and get the user_id
    const [profile] = await db
      .select({ userId: coderProfiles.userId })
      .from(coderProfiles)
      .where(eq(coderProfiles.id, coderId))
      .limit(1);

    if (profile) {
      coderUserId = profile.userId;
    }

    const title = type === "project"
      ? `Project with ${coderName}`
      : `Inquiry to ${coderName}`;

    const messageContent = type === "project"
      ? `Hi ${coderName}, I'd like to start a project with you.`
      : `Hi ${coderName}, I'd like to learn more about working with you.`;

    // Create a project
    const [project] = await db.insert(projects).values({
      title,
      description: `${type === "project" ? "Project" : "Inquiry"} initiated via vibechckd`,
      status: "draft",
    }).returning();

    // Add client as member
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      roleLabel: "Client",
    });

    // Add coder as member — skip if user ID is invalid (mock data)
    try {
      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: coderUserId,
        roleLabel: coderName.split(" ")[0],
      });
    } catch {
      // coderId might be from mock data (not a real UUID) — that's OK
    }

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
