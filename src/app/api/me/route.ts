import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Personal-profile fields that the user can edit themselves. Email is
// intentionally excluded — that goes through /api/settings's "Change email"
// flow which carries password verification.
const meSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    image: z
      .string()
      .trim()
      .refine(
        (s) => s.length === 0 || /^https?:\/\//i.test(s),
        { message: "Image must be a URL" }
      )
      .optional(),
  })
  .strict();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      whopUserId: users.whopUserId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...u,
    whopLinked: !!u.whopUserId,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rawBody = await request.json().catch(() => null);
  const parsed = parseBody(meSchema, rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.image !== undefined) {
    // Empty string clears the avatar; otherwise persist the URL.
    patch.image = parsed.data.image.length === 0 ? null : parsed.data.image;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: true });
  }
  await db.update(users).set(patch).where(eq(users.id, session.user.id));
  return NextResponse.json({ success: true });
}
