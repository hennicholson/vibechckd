import { NextRequest } from "next/server";
import { signIn } from "@/lib/auth";
import {
  findOrCreateWhopUser,
  signHandoff,
  verifyWhopUserToken,
} from "@/lib/whop-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whop SSO entry-point. Middleware rewrites `/` to here when the request
// arrives with `x-whop-user-token` and no NextAuth session cookie. The route
// runs the verify → upsert → sign-in flow server-side (a route handler is the
// only place where Auth.js v5 server-side `signIn` can set the session cookie),
// then redirects to `/` so the iframe URL never changes path.
export async function GET(request: NextRequest) {
  const tokenFromHeader = request.headers.get("x-whop-user-token");
  const tokenFromCookie = request.cookies.get("whop_user_token")?.value;
  const url = new URL(request.url);
  const devUserId = url.searchParams.get("whop_dev_user_id");
  const devEmail = url.searchParams.get("whop_dev_email");
  const devName = url.searchParams.get("whop_dev_name");

  const token = tokenFromHeader || tokenFromCookie || "";
  const dev =
    devUserId && process.env.NODE_ENV !== "production"
      ? {
          whopUserId: devUserId,
          email: devEmail,
          name: devName,
          image: null,
          whopCompanyId: null,
        }
      : undefined;

  try {
    const tokenPreview = token ? `${token.slice(0, 16)}…(${token.length} chars)` : "(none)";
    console.log(`[whop-sso] incoming token=${tokenPreview} dev=${!!dev}`);
    const profile = await verifyWhopUserToken(token, dev);
    console.log(
      `[whop-sso] verified whopUserId=${profile.whopUserId} email=${profile.email ?? "(none)"} name=${profile.name ?? "(none)"}`
    );
    const result = await findOrCreateWhopUser(profile);
    console.log(
      `[whop-sso] ${result.isNew ? "CREATED" : "linked"} userId=${result.id} role=${result.role}`
    );
    const handoff = signHandoff({ userId: result.id });
    await signIn("whop", { handoff, redirect: false });
    console.log(`[whop-sso] session cookie set for userId=${result.id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Whop SSO failed";
    console.error("[whop-sso route]", msg);
    const params = new URLSearchParams({ sso_error: msg });
    return relativeRedirect(`/whop?${params}`);
  }

  return relativeRedirect("/whop");
}

// `NextResponse.redirect` requires an absolute URL, which forces us to guess
// the user-visible origin via the Host header. That's unreliable through
// chained proxies (Whop edge → dev-proxy → next dev) where Host can be
// rewritten. Returning a raw Response with a relative Location lets the
// browser resolve it against whatever origin it's already on.
function relativeRedirect(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: location },
  });
}
