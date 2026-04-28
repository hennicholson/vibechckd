import { NextRequest, NextResponse } from "next/server";
import {
  findOrCreateWhopUser,
  signHandoff,
  verifyWhopUserToken,
  type WhopUserProfile,
} from "@/lib/whop-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/whop-handoff
//
// Body: { whopUserToken: string, dev?: { whopUserId, email, name, image, whopCompanyId } }
//
// 1. Verifies the Whop user token by calling Whop's /me with it.
// 2. Finds or creates the local user (linking by email if one already exists).
// 3. Returns a short-lived HMAC-signed handoff that the client passes to
//    next-auth's `whop` Credentials provider via signIn().
//
// The Whop token never reaches next-auth directly — splitting the verify and
// the sign-in keeps the credentials provider deterministic and avoids fetch
// calls inside the auth middleware path.
export async function POST(req: NextRequest) {
  let body: { whopUserToken?: string; dev?: Partial<WhopUserProfile> } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.whopUserToken;

  try {
    const profile = await verifyWhopUserToken(token || "", body.dev);
    const { id: userId, isNew } = await findOrCreateWhopUser(profile);
    const handoff = signHandoff({ userId });
    return NextResponse.json({ handoff, isNew });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whop SSO failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
