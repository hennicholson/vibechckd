import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userFavorites } from "@/db/schema";
import { parseBody, z } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/favorites — returns the current user's favorited coderProfileIds.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select({ coderProfileId: userFavorites.coderProfileId })
    .from(userFavorites)
    .where(eq(userFavorites.userId, session.user.id));
  return NextResponse.json({ ids: rows.map((r) => r.coderProfileId) });
}

const toggleSchema = z
  .object({ coderProfileId: z.string().uuid() })
  .strict();

// POST /api/favorites — toggle a favorite. Returns the new state ({ favorited: bool }).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseBody(toggleSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error },
      { status: 400 }
    );
  }
  const { coderProfileId } = parsed.data;

  const [existing] = await db
    .select({ id: userFavorites.id })
    .from(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, session.user.id),
        eq(userFavorites.coderProfileId, coderProfileId)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(userFavorites).where(eq(userFavorites.id, existing.id));
    return NextResponse.json({ favorited: false });
  }
  await db.insert(userFavorites).values({
    userId: session.user.id,
    coderProfileId,
  });
  return NextResponse.json({ favorited: true });
}
