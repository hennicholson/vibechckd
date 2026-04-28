import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import WhopBoundary from "./WhopBoundary";
import WhopStartCard from "./WhopStartCard";
import BrowsePage from "@/app/browse/page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchParams {
  whop_dev_user_id?: string;
  whop_dev_email?: string;
  whop_dev_name?: string;
  sso_error?: string;
  // Set to "1" by /api/whop/sso when it redirects back. If we see this AND
  // still have no session, the session cookie didn't survive the redirect
  // (browser blocked third-party cookies, etc.) — break the loop, show error.
  from_sso?: string;
}

// Whop sets the iframe user token via either a request header (production) or
// a cookie (some integration paths). We accept both. In dev (`AUTH_DEV_SKIP_VERIFICATION=1`)
// we also accept query overrides so you can test without standing up a real
// Whop iframe.
async function resolveWhopToken(): Promise<string> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  return (
    headerStore.get("x-whop-user-token") ||
    cookieStore.get("whop_user_token")?.value ||
    ""
  );
}

export default async function WhopAppPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    // Look up the user's onboarding state. Whop SSO leaves `emailVerified`
    // null until the user picks one of the three options (Client / Creator /
    // Browse) on the first-visit picker — we use that null as our "show the
    // picker" flag. Once they pick, the API stamps `emailVerified` and they
    // see BrowsePage on subsequent loads.
    const [u] = await db
      .select({ emailVerified: users.emailVerified, name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (u && !u.emailVerified) {
      return <WhopStartCard defaultName={u.name} />;
    }

    // Picked a path already — render the marketplace inline. We stay on /whop
    // so we keep the iframe-friendly CSP; navigating to /browse would still
    // work but the URL changing path can confuse the Whop wrapper.
    return <BrowsePage />;
  }

  const params = await searchParams;

  // If the SSO route bounced us back with an error, show it instead of
  // re-entering the redirect loop.
  if (params.sso_error) {
    return <WhopBoundary handoff={null} error={params.sso_error} />;
  }

  // We just came back from /api/whop/sso (it set Set-Cookie + Location:/whop)
  // but there's still no session here. That means the cookie didn't survive
  // the round-trip — almost always the browser blocking third-party cookies
  // for the Whop iframe origin. Break the loop and explain.
  if (params.from_sso === "1") {
    return (
      <WhopBoundary
        handoff={null}
        error="Your browser blocked the session cookie for this iframe (third-party cookie restrictions). Open vibechckd.cc directly to sign in, or enable cross-site cookies for whop.com."
      />
    );
  }

  const whopToken = await resolveWhopToken();

  // No session yet but we have a Whop token (or a dev override) → kick the
  // user through the SSO route handler. That handler is the only place where
  // Auth.js v5 can set the session cookie (server components can't), so we
  // redirect there with the dev override params (if any) preserved.
  if (whopToken || params.whop_dev_user_id) {
    const ssoUrl = new URL("/api/whop/sso", "http://placeholder");
    if (params.whop_dev_user_id) ssoUrl.searchParams.set("whop_dev_user_id", params.whop_dev_user_id);
    if (params.whop_dev_email) ssoUrl.searchParams.set("whop_dev_email", params.whop_dev_email);
    if (params.whop_dev_name) ssoUrl.searchParams.set("whop_dev_name", params.whop_dev_name);
    redirect(ssoUrl.pathname + ssoUrl.search);
  }

  // No token at all — likely opened directly outside the Whop iframe.
  return (
    <WhopBoundary
      handoff={null}
      error="No Whop user token in this request. Open this app from inside the Whop iframe."
    />
  );
}
