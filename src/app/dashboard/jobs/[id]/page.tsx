import { requireRole } from "@/lib/role-guard";
import JobDetailClient from "./JobDetailClient";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["client"]);
  const { id } = await params;
  return <JobDetailClient id={id} />;
}
