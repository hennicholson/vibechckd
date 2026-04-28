import { requireRole } from "@/lib/role-guard";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole(["admin"]);
  return <AdminClient />;
}
