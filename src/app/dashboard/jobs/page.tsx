import { requireRole } from "@/lib/role-guard";
import JobsListClient from "./JobsListClient";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await requireRole(["client"]);
  return <JobsListClient />;
}
