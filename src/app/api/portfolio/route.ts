import { NextResponse } from "next/server";
import { coders } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(coders[0].portfolio);
}

export async function POST(req: Request) {
  const body = await req.json();
  console.log("POST /api/portfolio", body);
  return NextResponse.json({ success: true, item: body });
}
