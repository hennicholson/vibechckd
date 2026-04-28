import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The Whop app config points at /whop, so the iframe always lands there
  // first. /whop's server component handles the SSO redirect on its own —
  // no middleware rewrite needed for the entry-point. Once signed in, the
  // user navigates freely into /dashboard, /browse, /coders, etc. and those
  // routes must render their actual content (NOT be rewritten back to /whop).

  // Check for session token (NextAuth v5 uses this cookie name)
  const token = request.cookies.get("authjs.session-token") ||
                request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    // API routes → return 401 JSON, don't redirect (would break JSON clients)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Team builder → redirect to client signup
    if (pathname.startsWith("/dashboard/teams")) {
      const url = request.nextUrl.clone();
      url.pathname = "/register";
      url.searchParams.set("role", "client");
      return NextResponse.redirect(url);
    }

    // Other dashboard pages → redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Forward the current pathname so server components can read it via
  // `headers().get("x-pathname")` — needed by the dashboard layout to detect
  // whether we're already on the welcome page (and skip the onboarding
  // redirect loop).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // The matcher needs "/" + "/whop*" so the Whop-token redirect runs on
  // first-load entries, plus the existing dashboard / admin gates.
  matcher: ["/", "/dashboard/:path*", "/api/admin/:path*"],
};
