import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  console.log(`POST /api/portfolio/${id}/assets`, body);
  return NextResponse.json({ success: true, portfolioItemId: id, asset: body });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  console.log(`DELETE /api/portfolio/${id}/assets`, body);
  return NextResponse.json({ success: true, portfolioItemId: id, assetId: body.assetId });
}
