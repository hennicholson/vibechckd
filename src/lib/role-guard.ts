import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Role = "client" | "coder" | "admin";

// Server-side role gate for dashboard pages. Used at the top of role-specific
// page server components — call before rendering the client component, so a
// `coder` URL-typing their way to `/dashboard/company` (client-only) gets
// bounced back to their own dashboard instead of a broken UI shell.
//
// Mirrors the `requireOnboarded()` shape in `src/lib/onboarding.ts` —
// throws a redirect on rejection (Next.js's `redirect()` works that way),
// returns `{ id, role }` on success.
export async function requireRole(
  allowed: Role[],
  fallback = "/dashboard"
): Promise<{ id: string; role: Role }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const role = session.user.role as Role | undefined;
  if (!role || !allowed.includes(role)) {
    redirect(fallback);
  }
  return { id: session.user.id, role };
}
