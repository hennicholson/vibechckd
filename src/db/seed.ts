import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import {
  users,
  coderProfiles,
  portfolioItems,
  portfolioAssets,
} from "./schema";

// Use inline connection — this script runs standalone via tsx, not in Next.js
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Import mock data using relative path (tsx resolves TS paths)
import { coders } from "../lib/mock-data";

const PASSWORD_HASH = hashSync("password123", 10);

async function seed() {
  console.log("Starting seed...\n");

  for (const coder of coders) {
    // 1. Create user
    const email = `${coder.slug}@vibechckd.cc`;
    const [user] = await db
      .insert(users)
      .values({
        name: coder.displayName,
        email,
        passwordHash: PASSWORD_HASH,
        role: "coder",
        createdAt: new Date(coder.joinedAt),
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });

    // If user already existed, fetch them
    let userId: string;
    if (user) {
      userId = user.id;
    } else {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      userId = existing[0].id;
    }

    // 2. Create coder profile
    const [profile] = await db
      .insert(coderProfiles)
      .values({
        userId,
        creatorSlug: coder.slug,
        bio: coder.bio,
        tagline: coder.tagline,
        location: coder.location,
        specialties: coder.specialties,
        tags: coder.skills,
        hourlyRate: coder.hourlyRate,
        availability: coder.availability,
        status: "active",
        verifiedAt: coder.verified ? new Date() : null,
        pfpUrl: coder.avatarUrl,
        githubUrl: coder.githubUrl ?? null,
        twitterUrl: coder.twitterUrl ?? null,
        linkedinUrl: coder.linkedinUrl ?? null,
        websiteUrl: coder.websiteUrl ?? null,
      })
      .onConflictDoNothing({ target: coderProfiles.creatorSlug })
      .returning({ id: coderProfiles.id });

    if (!profile) {
      console.log(`Skipped ${coder.displayName} (already exists)`);
      continue;
    }

    // 3. Create portfolio items and assets
    for (let i = 0; i < coder.portfolio.length; i++) {
      const item = coder.portfolio[i];
      const [portfolioItem] = await db
        .insert(portfolioItems)
        .values({
          coderProfileId: profile.id,
          title: item.title,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          sortOrder: i,
        })
        .returning({ id: portfolioItems.id });

      // 4. Create assets for this portfolio item
      for (let j = 0; j < item.assets.length; j++) {
        const asset = item.assets[j];
        await db.insert(portfolioAssets).values({
          portfolioItemId: portfolioItem.id,
          assetType: asset.type,
          title: asset.title,
          fileUrl: asset.url,
          thumbnailUrl: asset.thumbnailUrl ?? null,
          displayOrder: j,
        });
      }
    }

    console.log(`Seeded ${coder.displayName}`);
  }

  console.log(`\nSeed complete: ${coders.length} coders`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
