import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, specialties, portfolioLinks, rateExpectation, pitch } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const [application] = await db
      .insert(applications)
      .values({
        name,
        email,
        specialties: specialties || [],
        portfolioLinks: portfolioLinks || [],
        rateExpectation: rateExpectation || null,
        pitch: pitch || null,
        status: "applied",
      })
      .returning();

    return NextResponse.json({ success: true, id: application.id });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
