import { NextRequest, NextResponse } from "next/server";
import { getCachedCodersList } from "@/lib/cache";

// Public, read-heavy endpoint. Previously ran an N+1:
//   1  coders query
//   N  portfolio_items queries (one per coder)
//   N*M portfolio_assets queries (one per item)
// With 100 coders * 10 items * 5 assets that's ~1,000+ round trips.
//
// New shape executes at most 3 DB queries regardless of list size:
//   Q1  coders JOIN users (paginated)
//   Q2  portfolio_items WHERE coder_profile_id IN (...)
//   Q3  portfolio_assets WHERE portfolio_item_id IN (...)
// Results are regrouped in memory via Map<id, rows[]>.
//
// Wrapped in `unstable_cache` (60s revalidate, tagged `coders-list`) and
// served with s-maxage=30, stale-while-revalidate=60 so Netlify's edge
// holds the list for 30s with background refresh up to 60s.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50)
    );
    const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);

    const coders = await getCachedCodersList(limit, offset);

    return NextResponse.json(coders, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching coders:", error);
    return NextResponse.json(
      { error: "Failed to fetch coders" },
      { status: 500 }
    );
  }
}
