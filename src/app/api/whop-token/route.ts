import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePayoutPortalToken } from "@/lib/whop";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Look up user's connected Whop company (check coderProfiles first, then users)
    let whopCompanyId: string | null = null;

    const [profile] = await db
      .select({ whopCompanyId: coderProfiles.whopCompanyId })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, userId))
      .limit(1);

    if (profile?.whopCompanyId) {
      whopCompanyId = profile.whopCompanyId;
    } else {
      const [user] = await db
        .select({ whopCompanyId: users.whopCompanyId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      whopCompanyId = user?.whopCompanyId ?? null;
    }

    if (!whopCompanyId) {
      return Response.json({ connected: false });
    }

    const token = await generatePayoutPortalToken(whopCompanyId);

    return Response.json({
      token,
      companyId: whopCompanyId,
      connected: true,
    });
  } catch (error) {
    console.error("Whop token error:", error);
    return Response.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
