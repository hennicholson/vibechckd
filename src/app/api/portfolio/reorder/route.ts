import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const body = await req.json();
  console.log("PUT /api/portfolio/reorder", body);
  return NextResponse.json({ success: true, order: body.order });
}
