import { requireOnboarded } from "@/lib/onboarding";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // First-time Whop SSO users get bounced to /dashboard/welcome to set their
  // email/password before they see the dashboard. No-op for non-SSO users
  // and for users who've already completed onboarding.
  await requireOnboarded("/dashboard");
  return <DashboardClient />;
}
