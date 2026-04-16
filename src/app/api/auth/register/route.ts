import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, coderProfiles, clientProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { name, email, password, role: requestedRole, onboarding } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const role = requestedRole === "client" ? "client" : "coder";

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
      })
      .returning();

    // Create coder profile only for coders
    if (role === "coder") {
      // Generate slug from name, handling edge cases
      let baseSlug = (name || "coder")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!baseSlug) {
        baseSlug = "coder";
      }

      // Check for duplicate slugs and append random suffix if needed
      let slug = baseSlug;
      const [existingSlug] = await db
        .select()
        .from(coderProfiles)
        .where(eq(coderProfiles.creatorSlug, slug))
        .limit(1);

      if (existingSlug) {
        const suffix = Math.random().toString(36).substring(2, 6);
        slug = `${baseSlug}-${suffix}`;
      }

      // Extract onboarding data for coder profile
      const specialties = onboarding?.specialties || [];
      const websiteUrl = onboarding?.portfolioUrl || null;

      await db.insert(coderProfiles).values({
        userId: user.id,
        creatorSlug: slug,
        status: "draft",
        specialties: specialties.length > 0 ? specialties : null,
        websiteUrl,
      });
    }

    // Create client profile for clients
    if (role === "client") {
      await db.insert(clientProfiles).values({
        userId: user.id,
        companyName: onboarding?.companyName || null,
        projectTypes: onboarding?.projectType ? [onboarding.projectType] : null,
        budgetRange: onboarding?.budget || null,
      });
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
