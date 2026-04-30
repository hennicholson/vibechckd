import { requireRole } from "@/lib/role-guard";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireRole(["coder", "admin"]);
  return <ProfileClient />;
}
