import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, pinned } = body;

    if (!projectId) {
      return Response.json({ error: "projectId required" }, { status: 400 });
    }

    await db
      .update(projectMembers)
      .set({ pinned: !!pinned })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, session.user.id)
        )
      );

    return Response.json({ success: true, pinned: !!pinned });
  } catch (error) {
    console.error("Pin error:", error);
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }
}
