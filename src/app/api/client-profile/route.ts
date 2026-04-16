import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { clientProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) {
    // Return defaults from the user record
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json({
      displayName: user?.name ?? "",
      email: user?.email ?? "",
      companyName: "",
      companyStage: "",
      industry: "",
      website: "",
      description: "",
      projectTypes: [],
      budgetRange: "",
      teamSize: "",
    });
  }

  // Fetch user name/email for displayName
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    displayName: user?.name ?? "",
    email: user?.email ?? "",
    companyName: profile.companyName ?? "",
    companyStage: profile.companyStage ?? "",
    industry: profile.industry ?? "",
    website: profile.website ?? "",
    description: profile.description ?? "",
    projectTypes: profile.projectTypes ?? [],
    budgetRange: profile.budgetRange ?? "",
    teamSize: profile.teamSize ?? "",
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Upsert: check if profile exists
  const [existing] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, session.user.id))
    .limit(1);

  const profileData = {
    companyName: body.companyName ?? null,
    companyStage: body.companyStage ?? null,
    industry: body.industry ?? null,
    website: body.website ?? null,
    description: body.description ?? null,
    projectTypes: body.projectTypes ?? [],
    budgetRange: body.budgetRange ?? null,
    teamSize: body.teamSize ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(clientProfiles)
      .set(profileData)
      .where(eq(clientProfiles.id, existing.id));
  } else {
    await db.insert(clientProfiles).values({
      userId: session.user.id,
      ...profileData,
    });
  }

  // Also update user name if displayName provided
  if (body.displayName) {
    await db
      .update(users)
      .set({ name: body.displayName })
      .where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
