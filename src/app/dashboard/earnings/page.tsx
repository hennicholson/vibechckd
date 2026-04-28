import { requireRole } from "@/lib/role-guard";
import EarningsClient from "./EarningsClient";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  await requireRole(["coder"]);
  return <EarningsClient />;
}
