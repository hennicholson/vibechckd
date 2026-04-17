import { auth } from "@/lib/auth";
import { db } from "@/db";
import { coderProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePayoutPortalLink } from "@/lib/whop";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Find connected Whop company ID
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
      return Response.json({ error: "No payout account set up yet. Make a withdrawal first to create your payout account." }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";
    const url = await generatePayoutPortalLink({
      connectedCompanyId: whopCompanyId,
      returnUrl: `${baseUrl}/dashboard/earnings`,
    });

    return Response.json({ url });
  } catch (error) {
    console.error("Payout portal error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate portal link";
    return Response.json({ error: message }, { status: 500 });
  }
}
