import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const typeFilter = searchParams.get("type");
    const offset = (page - 1) * limit;

    const userId = session.user.id;

    // Build conditions
    const conditions = [eq(transactions.userId, userId)];
    if (typeFilter) {
      conditions.push(eq(transactions.type, typeFilter as any));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);

    // Get paginated results
    const rows = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      transactions: rows,
      total: Number(countResult.count),
      page,
      limit,
    });
  } catch (error) {
    console.error("Transactions fetch failed:", error);
    return Response.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
