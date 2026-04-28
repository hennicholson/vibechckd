import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { encode } from "@auth/core/jwt";
import { verifyUserToken } from "@whop/sdk/lib/verify-user-token.js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// We use the iframe-mode cookie names (set by `AUTH_IFRAME_COOKIES=1` in
// `src/lib/auth.ts`). When that env flag is on, Auth.js stores the session
// at `__Secure-authjs.session-token`; otherwise at the unprefixed name.
// We support both so the same middleware works in HTTPS prod and HTTP dev.
const SESSION_COOKIE_SECURE = "__Secure-authjs.session-token";
const SESSION_COOKIE_PLAIN = "authjs.session-token";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches Auth.js default

export const config = {
  // Run on Node runtime so we can use Drizzle + Neon's HTTP driver and the
  // Auth.js JWT encoder. Edge runtime would also work for jose but Drizzle
  // imports `pg-types` which isn't bundled for the edge.
  runtime: "nodejs",
  matcher: [
    // All routes except Next.js internals, NextAuth's own handlers, and
    // static assets. The Whop-token → session cookie minting needs to run
    // before any page or API does its own auth() check.
    "/((?!_next/static|_next/image|api/auth|favicon.ico|icon.svg|site.webmanifest|hero/|robots.txt).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Try to mint a session cookie from the Whop iframe token if we don't
  // already have one. This makes the iframe flow work even when the browser
  // blocks third-party cookies — middleware re-derives the session from the
  // Whop-supplied JWT on every request, so cookies never need to "stick"
  // across page loads inside the iframe.
  const hasSession =
    request.cookies.has(SESSION_COOKIE_SECURE) ||
    request.cookies.has(SESSION_COOKIE_PLAIN);

  let injectedCookieHeader: string | null = null;
  let injectedSetCookie: { name: string; value: string } | null = null;

  if (!hasSession) {
    const whopToken = request.headers.get("x-whop-user-token");
    if (whopToken && process.env.AUTH_SECRET && process.env.WHOP_APP_ID) {
      try {
        const claims = await verifyUserToken(whopToken, {
          appId: process.env.WHOP_APP_ID,
        });
        if (claims?.userId) {
          const [u] = await db
            .select({
              id: users.id,
              role: users.role,
              name: users.name,
              email: users.email,
              image: users.image,
            })
            .from(users)
            .where(eq(users.whopUserId, claims.userId))
            .limit(1);

          if (u) {
            // Mint an Auth.js-compatible session JWT keyed by the same
            // cookie name + secret so downstream `auth()` reads it
            // transparently. We pick the cookie name that matches the
            // app's iframe-cookie config.
            const cookieName =
              process.env.AUTH_IFRAME_COOKIES === "1"
                ? SESSION_COOKIE_SECURE
                : SESSION_COOKIE_PLAIN;

            const now = Math.floor(Date.now() / 1000);
            const sessionJwt = await encode({
              token: {
                sub: u.id,
                id: u.id,
                role: u.role,
                name: u.name,
                email: u.email,
                picture: u.image,
                iat: now,
                exp: now + SESSION_MAX_AGE,
                jti: crypto.randomUUID(),
              },
              secret: process.env.AUTH_SECRET,
              salt: cookieName,
              maxAge: SESSION_MAX_AGE,
            });

            // Inject into the request the page handler will see, so that
            // any `auth()` call downstream reads a valid session.
            const existing = request.headers.get("cookie") || "";
            injectedCookieHeader = existing
              ? `${existing}; ${cookieName}=${sessionJwt}`
              : `${cookieName}=${sessionJwt}`;
            injectedSetCookie = { name: cookieName, value: sessionJwt };
          }
        }
      } catch {
        // Invalid Whop token (signature failure, audience mismatch, etc.).
        // Fall through to the normal "no session" handling below.
      }
    }
  }

  // After potentially synthesizing a session, re-evaluate whether we have
  // one to gate dashboard / admin access.
  const haveSessionNow = hasSession || !!injectedCookieHeader;

  // Auth gates for sensitive paths. Same behaviour as the original
  // middleware, just executed *after* the Whop-token fallback so iframe
  // users get through.
  if (!haveSessionNow) {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname.startsWith("/dashboard/teams")) {
      const url = request.nextUrl.clone();
      url.pathname = "/register";
      url.searchParams.set("role", "client");
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Forward request with synthesized cookie + pathname header so server
  // components can introspect the URL (used by the onboarding guard).
  const reqHeaders = new Headers(request.headers);
  if (injectedCookieHeader) reqHeaders.set("cookie", injectedCookieHeader);
  reqHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({ request: { headers: reqHeaders } });

  // Best-effort: also set the cookie on the response so the browser caches
  // it. If it gets blocked (third-party cookie restrictions inside an
  // iframe), we still re-mint on the next request from the Whop token, so
  // the user experience is identical.
  if (injectedSetCookie) {
    response.cookies.set(injectedSetCookie.name, injectedSetCookie.value, {
      httpOnly: true,
      secure: process.env.AUTH_IFRAME_COOKIES === "1",
      sameSite: process.env.AUTH_IFRAME_COOKIES === "1" ? "none" : "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  return response;
}
