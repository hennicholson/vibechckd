// POST /api/account/role
//
// Switches the signed-in user's role between "client" and "coder" (creator).
// Admin → admin role is preserved and cannot be downgraded here.
//
// What we keep:
//   - All transactions, withdrawals, projects, inbox threads stay attached
//     to the user_id, so history persists across the switch.
//   - The creator's coderProfile row stays in the database — switching back
//     restores it intact (no destructive side effects).
//
// What changes:
//   - users.role enum is updated (coder ↔ client).
//   - The dashboard sidebar re-renders with the role's nav rail.
//
// Caller is expected to call signIn/refresh on the client so the JWT
// reflects the new role on the next page load.

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target = body.role;
  if (target !== "client" && target !== "coder") {
    return Response.json(
      { error: "role must be 'client' or 'coder'" },
      { status: 400 }
    );
  }

  // Don't let an admin downgrade themselves accidentally — admins keep
  // admin until an explicit admin-tools change.
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  if (user.role === "admin") {
    return Response.json(
      { error: "Admins manage their role from the admin panel." },
      { status: 403 }
    );
  }
  if (user.role === target) {
    return Response.json({ role: user.role, changed: false });
  }

  await db
    .update(users)
    .set({ role: target as "client" | "coder" })
    .where(eq(users.id, session.user.id));

  return Response.json({ role: target, changed: true });
}
