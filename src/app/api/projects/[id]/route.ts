import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, users, coderProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get project members with user details
    const members = await db
      .select({
        roleLabel: projectMembers.roleLabel,
        userId: projectMembers.userId,
        userName: users.name,
        userImage: users.image,
        slug: coderProfiles.creatorSlug,
        pfpUrl: coderProfiles.pfpUrl,
        specialties: coderProfiles.specialties,
        verified: coderProfiles.verifiedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .leftJoin(coderProfiles, eq(coderProfiles.userId, users.id))
      .where(eq(projectMembers.projectId, id));

    return NextResponse.json({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt?.toISOString(),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.userName || "Unknown",
        role: m.roleLabel,
        avatarUrl: m.pfpUrl || "",
        slug: m.slug || "",
        specialties: m.specialties || [],
        verified: !!m.verified,
      })),
    });
  } catch (error) {
    console.error("Project fetch error:", error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}
