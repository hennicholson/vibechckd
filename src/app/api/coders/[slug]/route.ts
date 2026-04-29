import { NextResponse } from "next/server";
import { getCachedCoderBySlug } from "@/lib/cache";

// Single-coder fetch for /coders/[slug]. The browse page used to share the
// /api/coders list endpoint and the slug page would .find() over the entire
// (up to 100) coders payload — wasteful. This route hits the per-slug
// data-cache wrapper so the response is one row + its portfolio, not the
// whole gallery.
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const coder = await getCachedCoderBySlug(slug);
    if (!coder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(coder, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error fetching coder by slug:", error);
    return NextResponse.json(
      { error: "Failed to fetch coder" },
      { status: 500 }
    );
  }
}
