import { requireRole } from "@/lib/role-guard";
import PortfolioClient from "./PortfolioClient";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  await requireRole(["coder", "admin"]);
  return <PortfolioClient />;
}
