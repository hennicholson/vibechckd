import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session token (NextAuth v5 uses this cookie name)
  const token = request.cookies.get("authjs.session-token") ||
                request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
