import { requireRole } from "@/lib/role-guard";
import JobNewClient from "./JobNewClient";

export const dynamic = "force-dynamic";

export default async function JobNewPage() {
  await requireRole(["client"]);
  return <JobNewClient />;
}
