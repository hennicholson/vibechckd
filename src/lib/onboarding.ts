import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Used by dashboard pages to gate access on completion of the first-run
// flow. Whop SSO creates accounts with a placeholder email and no password —
// we send those users to /dashboard/welcome until they pick real credentials,
// so they can also sign in directly outside the Whop iframe.
//
// Call this at the top of any dashboard page server component that should
// require onboarding (the home page, primarily). Pages that don't call it
// (the welcome page itself) render normally even for first-time users.
export async function requireOnboarded(currentPath: string = "/dashboard") {
  const session = await auth();
  if (!session?.user?.id) return;

  const [user] = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
      whopUserId: users.whopUserId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.whopUserId) return; // Not an SSO user — nothing to onboard.

  const placeholderEmail = user.email?.endsWith("@vibechckd.local") ?? false;
  if (user.passwordHash && !placeholderEmail) return; // Already onboarded.

  redirect(`/dashboard/welcome?next=${encodeURIComponent(currentPath)}`);
}
