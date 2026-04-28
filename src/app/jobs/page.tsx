import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import JobsBrowseClient from "./JobsBrowseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function JobsBrowsePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/jobs");
  // Both creators and admins can see the board. Clients are redirected to
  // their dashboard view (where they post + manage their own jobs).
  const role = (session.user as { role?: string }).role;
  if (role === "client") redirect("/dashboard/jobs");
  return <JobsBrowseClient />;
}
