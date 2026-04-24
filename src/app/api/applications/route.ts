import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { desc } from "drizzle-orm";
import { emails } from "@/lib/email";
import { parseBody, z } from "@/lib/validation";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const httpUrl = z.string().url().max(2048);

const applicationSchema = z
  .object({
    userId: z.string().uuid().optional(),
    name: z.string().min(1).max(200).trim(),
    email: z.string().email().max(320).trim().toLowerCase(),
    specialties: z.array(z.string().min(1).max(60)).max(30).optional(),
    portfolioLinks: z.array(httpUrl).max(20).optional(),
    sampleProjectUrls: z.array(httpUrl).max(20).optional(),
    rateExpectation: z.string().min(1).max(200),
    pitch: z.string().max(5000).optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    // Rate-limit: 5 submissions per IP per 10 minutes.
    const rl = checkRateLimit(
      rateLimitKey(req, "applications:post"),
      5,
      10 * 60 * 1000
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.max(
              1,
              Math.ceil((rl.resetAt - Date.now()) / 1000)
            ).toString(),
          },
        }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = parseBody(applicationSchema, rawBody);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error },
        { status: 400 }
      );
    }
    const {
      userId,
      name,
      email,
      specialties,
      portfolioLinks,
      sampleProjectUrls,
      rateExpectation,
      pitch,
    } = parsed.data;

    // Merge portfolio links and sample project URLs into the portfolioLinks array
    const allLinks: string[] = [
      ...(portfolioLinks || []),
      ...(sampleProjectUrls || []),
    ];

    const [application] = await db
      .insert(applications)
      .values({
        userId: userId || null,
        name,
        email,
        specialties: specialties || [],
        portfolioLinks: allLinks,
        sampleProjectUrl: sampleProjectUrls?.length
          ? sampleProjectUrls.join(",")
          : null,
        rateExpectation,
        pitch: pitch || null,
        status: "applied",
      })
      .returning();

    // Fire-and-forget application confirmation email
    emails.applicationSubmitted(email, name).catch(() => {});

    return NextResponse.json({ success: true, id: application.id });
  } catch (error) {
    console.error("Application submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // SECURITY: Require admin role to list all applications
    const session = await auth();
    if (
      !session?.user ||
      (session.user as unknown as { role?: string }).role !== "admin"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allApplications = await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));

    return NextResponse.json({ applications: allApplications });
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
