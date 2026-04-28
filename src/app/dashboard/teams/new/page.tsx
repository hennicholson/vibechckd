import { requireRole } from "@/lib/role-guard";
import TeamsNewClient from "./TeamsNewClient";

export const dynamic = "force-dynamic";

export default async function TeamsNewPage() {
  await requireRole(["client"]);
  return <TeamsNewClient />;
}
