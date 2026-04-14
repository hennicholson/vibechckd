import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth) {
    // Team builder → redirect to client signup
    if (pathname.startsWith("/dashboard/teams")) {
      const url = req.nextUrl.clone();
      url.pathname = "/register";
      url.searchParams.set("role", "client");
      return NextResponse.redirect(url);
    }

    // Other dashboard pages → redirect to login
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
