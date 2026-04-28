import { requireRole } from "@/lib/role-guard";
import CompanyClient from "./CompanyClient";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  await requireRole(["client"]);
  return <CompanyClient />;
}
