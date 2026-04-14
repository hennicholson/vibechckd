import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { coders } from "@/lib/mock-data";

const mockProfile = {
  displayName: coders[0].displayName,
  tagline: coders[0].tagline,
  location: coders[0].location,
  bio: coders[0].bio,
  specialties: coders[0].specialties,
  hourlyRate: coders[0].hourlyRate,
  githubUrl: coders[0].githubUrl ?? "",
  twitterUrl: coders[0].twitterUrl ?? "",
  linkedinUrl: coders[0].linkedinUrl ?? "",
  websiteUrl: coders[0].websiteUrl ?? "",
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(mockProfile);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  console.log("Profile update:", body);

  return NextResponse.json({ success: true });
}
