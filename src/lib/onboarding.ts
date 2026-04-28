import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Used by dashboard pages to gate access on completion of the first-run
// flow. Whop SSO users complete onboarding via the iframe picker on /whop
// (which stamps `emailVerified` on submit). Non-Whop email users complete
// it via /register + the magic-link verification.
//
// Rule:
//   - No session → no-op (page-level auth gate handles it).
//   - Whop SSO user (whopUserId set):
//       - emailVerified set     → onboarded (don't redirect; password +
//                                 real email are optional, set later from
//                                 /dashboard/settings).
//       - emailVerified null    → still on the start picker; bounce to
//                                 /whop instead of /dashboard/welcome so
//                                 they finish the iframe flow.
//   - Non-Whop user:
//       - placeholder email or no password → /dashboard/welcome.
//       - otherwise → onboarded.
export async function requireOnboarded(currentPath: string = "/dashboard") {
  const session = await auth();
  if (!session?.user?.id) return;

  const [user] = await db
    .select({
      email: users.email,
      passwordHash: users.passwordHash,
      whopUserId: users.whopUserId,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return;

  if (user.whopUserId) {
    // Whop SSO path: onboarded === picked a path on /whop (emailVerified set).
    if (user.emailVerified) return;
    redirect("/whop");
  }

  // Email/password path.
  const placeholderEmail = user.email?.endsWith("@vibechckd.local") ?? false;
  if (user.passwordHash && !placeholderEmail) return;

  redirect(`/dashboard/welcome?next=${encodeURIComponent(currentPath)}`);
}
