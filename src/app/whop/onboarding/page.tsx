import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, clientProfiles, coderProfiles } from "@/db/schema";
import ClientOnboardingForm from "./ClientOnboardingForm";
import CreatorOnboardingForm from "./CreatorOnboardingForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Role-specific onboarding form for Whop SSO users who picked Client or
// Creator on /whop's first-visit start card. Submitting either form stamps
// `users.emailVerified`, which is the gate that lets them skip back into
// the marketplace next time.
//
// Flow guards:
//   - No session → /whop (which will SSO them or show the boundary).
//   - Already onboarded (emailVerified set) → /whop (BrowsePage).
//   - No seeded profile → /whop (back to the start picker).
export default async function WhopOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/whop");

  const [u] = await db
    .select({
      role: users.role,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!u) redirect("/whop");
  if (u.emailVerified) redirect("/whop");

  if (u.role === "coder") {
    const [coder] = await db
      .select({ id: coderProfiles.id })
      .from(coderProfiles)
      .where(eq(coderProfiles.userId, session.user.id))
      .limit(1);
    if (!coder) redirect("/whop");
    return <CreatorOnboardingForm defaultName={u.name} />;
  }

  // role === "client" or "admin" — only client gets a profile seeded; if
  // there's no clientProfile we route back to the picker.
  const [client] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, session.user.id))
    .limit(1);
  if (!client) redirect("/whop");
  return <ClientOnboardingForm defaultName={u.name} />;
}
