import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages } from "@/db/schema";

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

    // Add both users as project members
    await db.insert(projectMembers).values([
      { projectId: project.id, userId: session.user.id, roleLabel: "Client" },
      { projectId: project.id, userId: coderId, roleLabel: coderName.split(" ")[0] },
    ]);

    // Send initial message
    await db.insert(messages).values({
      projectId: project.id,
      senderId: session.user.id,
      content: messageContent,
      messageType: "text",
    });

    return NextResponse.json({ success: true, projectId: project.id });
  } catch (error) {
    console.error("Inquiry error:", error);
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}
