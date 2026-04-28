import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import JobApplyClient from "./JobApplyClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/jobs");
  const role = (session.user as { role?: string }).role;
  if (role === "client") redirect("/dashboard/jobs");
  const { id } = await params;
  return <JobApplyClient id={id} />;
}
