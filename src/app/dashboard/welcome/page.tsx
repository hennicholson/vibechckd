import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import WelcomeForm from "./WelcomeForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user] = await db
    .select({
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      whopUserId: users.whopUserId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // If the user has already finished onboarding (has a real email + password),
  // skip welcome — send them to wherever they were heading or their dashboard.
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const placeholderEmail = user?.email?.endsWith("@vibechckd.local") ?? false;
  if (user?.passwordHash && !placeholderEmail) {
    redirect(next);
  }

  return (
    <WelcomeForm
      defaultEmail={placeholderEmail ? "" : user?.email ?? ""}
      defaultName={user?.name ?? ""}
      next={next}
      cameFromWhop={!!user?.whopUserId}
    />
  );
}
