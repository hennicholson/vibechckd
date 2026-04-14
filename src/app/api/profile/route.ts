import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
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
      tagline: "",
      location: "",
      bio: "",
      specialties: [],
      hourlyRate: "",
      availability: "available",
      githubUrl: "",
      twitterUrl: "",
      linkedinUrl: "",
      websiteUrl: "",
      avatarUrl: "",
      gifPreviewUrl: "",
    });
  }

  // Fetch user name for displayName
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const gifPreviewUrl = profile.gifPreviewUrl ?? "";

  return NextResponse.json({
    displayName: user?.name ?? "",
    tagline: profile.tagline ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    specialties: profile.specialties ?? [],
    hourlyRate: profile.hourlyRate ?? "",
    availability: profile.availability ?? "available",
    githubUrl: profile.githubUrl ?? "",
    twitterUrl: profile.twitterUrl ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    avatarUrl: profile.pfpUrl ?? "",
    gifPreviewUrl,
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
    .select({ id: coderProfiles.id })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  const profileData = {
    tagline: body.tagline ?? null,
    location: body.location ?? null,
    bio: body.bio ?? null,
    specialties: body.specialties ?? [],
    hourlyRate: body.hourlyRate ?? null,
    availability: body.availability ?? "available",
    githubUrl: body.githubUrl ?? null,
    twitterUrl: body.twitterUrl ?? null,
    linkedinUrl: body.linkedinUrl ?? null,
    websiteUrl: body.websiteUrl ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(coderProfiles)
      .set(profileData)
      .where(eq(coderProfiles.id, existing.id));
  } else {
    await db.insert(coderProfiles).values({
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
