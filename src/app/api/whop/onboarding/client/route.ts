import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, clientProfiles } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

// Submit handler for the Whop client onboarding form. Updates the empty
// clientProfile that /api/whop/start seeded, then stamps `emailVerified` so
// the user is considered fully onboarded and bypasses the start picker on
// future visits. `skip: true` accepts the row as-is and just stamps.
const clientOnboardingSchema = z
  .union([
    z.object({ skip: z.literal(true) }).strict(),
    z
      .object({
        companyName: z.string().trim().max(120).optional(),
        projectType: z.string().trim().max(60).optional(),
        budget: z.string().trim().max(60).optional(),
        description: z.string().trim().max(500).optional(),
      })
      .strict(),
  ]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(clientOnboardingSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }

  if (!("skip" in parsed.data)) {
    const { companyName, projectType, budget, description } = parsed.data;
    await db
      .update(clientProfiles)
      .set({
        companyName: companyName?.length ? companyName : null,
        projectTypes: projectType?.length ? [projectType] : null,
        budgetRange: budget?.length ? budget : null,
        description: description?.length ? description : null,
        updatedAt: new Date(),
      })
      .where(eq(clientProfiles.userId, session.user.id));
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
