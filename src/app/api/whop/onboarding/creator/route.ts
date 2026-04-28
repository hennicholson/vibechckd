import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, coderProfiles } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

// Submit handler for the Whop creator onboarding form. Updates the draft
// coderProfile that /api/whop/start seeded with specialties + portfolio
// URL + experience level, generates a creatorSlug from the user's name,
// then stamps `users.emailVerified` so the start picker doesn't reappear.
//
// After this, the client UI sends them to /apply for the full vetting
// flow (portfolio uploads, work samples, etc.).
const creatorOnboardingSchema = z
  .object({
    specialties: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    portfolioUrl: z.string().trim().url().max(2048).nullable().optional(),
    experience: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(creatorOnboardingSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { specialties, portfolioUrl, experience } = parsed.data;

  const [u] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Build a unique creatorSlug if we don't already have one set.
  const [existingProfile] = await db
    .select({ slug: coderProfiles.creatorSlug })
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, session.user.id))
    .limit(1);

  let slug: string | null = existingProfile?.slug ?? null;
  if (!slug) {
    const base = slugify(u?.name || "creator") || "creator";
    slug = base;
    // Disambiguate against any other coder profile already using this slug.
    const [collision] = await db
      .select({ id: coderProfiles.id })
      .from(coderProfiles)
      .where(
        and(eq(coderProfiles.creatorSlug, slug), ne(coderProfiles.userId, session.user.id))
      )
      .limit(1);
    if (collision) {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  await db
    .update(coderProfiles)
    .set({
      creatorSlug: slug,
      specialties,
      websiteUrl: portfolioUrl ?? null,
      experience: experience ?? null,
      updatedAt: new Date(),
    })
    .where(eq(coderProfiles.userId, session.user.id));

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
