import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  console.log(`PUT /api/portfolio/${id}`, body);
  return NextResponse.json({ success: true, id, item: body });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`DELETE /api/portfolio/${id}`);
  return NextResponse.json({ success: true, id });
}
