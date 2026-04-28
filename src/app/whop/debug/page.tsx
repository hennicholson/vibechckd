import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyWhopUserTokenDetailed } from "@/lib/whop-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchParams {
  whop_dev_user_id?: string;
  whop_dev_email?: string;
  whop_dev_name?: string;
}

interface ProbeResult {
  ok: boolean;
  source?: "whop-jwt" | "dev-override";
  appIdMatch?: string | null;
  whopUserId?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  error?: string;
}

// Render a small key/value table without leaking secrets.
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border last:border-b-0">
      <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted w-44 flex-shrink-0">
        {k}
      </span>
      <span className="text-[12px] text-text-primary break-all flex-1">{v}</span>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-[11px] font-mono uppercase tracking-wider ${
        ok ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-positive" : "bg-negative"}`} />
      {label}
    </span>
  );
}

export default async function WhopDebugPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const headerStore = await headers();
  const cookieStore = await cookies();
  const session = await auth();

  const tokenFromHeader = headerStore.get("x-whop-user-token");
  const tokenFromCookie = cookieStore.get("whop_user_token")?.value || null;
  const referer = headerStore.get("referer");
  const origin = headerStore.get("origin");
  const userAgent = headerStore.get("user-agent");
  const inIframeHint = referer && referer.includes("whop.com");
  const tokenPresent = !!(tokenFromHeader || tokenFromCookie);

  const dev =
    params.whop_dev_user_id && process.env.NODE_ENV !== "production"
      ? {
          whopUserId: params.whop_dev_user_id,
          email: params.whop_dev_email ?? null,
          name: params.whop_dev_name ?? null,
          image: null,
          whopCompanyId: null,
        }
      : undefined;

  // Run the actual verifier so we see exactly what the SSO endpoint would see.
  let probe: ProbeResult;
  try {
    const result = await verifyWhopUserTokenDetailed(
      tokenFromHeader || tokenFromCookie || "",
      dev
    );
    probe = {
      ok: true,
      source: result.source,
      appIdMatch: result.appId,
      whopUserId: result.profile.whopUserId,
      email: result.profile.email,
      name: result.profile.name,
      image: result.profile.image,
    };
  } catch (err) {
    probe = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Whop-related cookies (names only, no values, since those are session secrets).
  const whopCookieNames = cookieStore
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.toLowerCase().includes("whop"));

  // Whop-related headers (boolean presence only — no values, JWTs are sensitive).
  const whopHeaderNames: string[] = [];
  headerStore.forEach((_v, k) => {
    if (k.toLowerCase().includes("whop")) whopHeaderNames.push(k);
  });

  const envFlags = {
    WHOP_API_KEY: !!process.env.WHOP_API_KEY,
    WHOP_APP_ID: !!process.env.WHOP_APP_ID,
    WHOP_COMPANY_ID: !!process.env.WHOP_COMPANY_ID,
    WHOP_WEBHOOK_SECRET: !!process.env.WHOP_WEBHOOK_SECRET,
    AUTH_DEV_SKIP_VERIFICATION: process.env.AUTH_DEV_SKIP_VERIFICATION === "1",
    AUTH_SECRET: !!process.env.AUTH_SECRET,
  };

  return (
    <main className="min-h-screen bg-background-alt">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
            Whop SSO debug
          </h1>
          <a
            href="/whop"
            className="text-[12px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary"
          >
            ← /whop
          </a>
        </div>

        {/* Top-line status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="border border-border rounded-[10px] p-4 bg-background">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
              Token detected
            </p>
            <StatusPill ok={tokenPresent} label={tokenPresent ? "yes" : "no"} />
          </div>
          <div className="border border-border rounded-[10px] p-4 bg-background">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
              Verification
            </p>
            <StatusPill ok={probe.ok} label={probe.ok ? probe.source ?? "ok" : "failed"} />
          </div>
          <div className="border border-border rounded-[10px] p-4 bg-background">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
              Iframe context
            </p>
            <StatusPill
              ok={!!inIframeHint}
              label={inIframeHint ? "whop referer" : "direct load"}
            />
          </div>
        </div>

        {/* Verifier result */}
        <section className="border border-border rounded-[10px] p-5 bg-background mb-4">
          <h2 className="text-[14px] font-medium text-text-primary mb-3">Verifier output</h2>
          {probe.ok ? (
            <div className="space-y-0">
              <Row k="source" v={<code className="font-mono">{probe.source}</code>} />
              <Row k="whop user id" v={<code className="font-mono">{probe.whopUserId}</code>} />
              <Row k="audience (appId)" v={<code className="font-mono">{probe.appIdMatch ?? "—"}</code>} />
              <Row k="email" v={probe.email ?? <span className="text-text-muted">—</span>} />
              <Row k="name" v={probe.name ?? <span className="text-text-muted">—</span>} />
              <Row
                k="profile picture"
                v={
                  probe.image ? (
                    <a href={probe.image} target="_blank" rel="noreferrer" className="underline">
                      open
                    </a>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-negative font-mono">{probe.error}</p>
              <p className="text-[11px] text-text-muted">
                If you&apos;re running outside the Whop iframe, append{" "}
                <code className="font-mono text-[10px] bg-surface-muted px-1 py-0.5 rounded">
                  ?whop_dev_user_id=user_xxx&whop_dev_email=foo@bar.com&whop_dev_name=Test
                </code>{" "}
                and ensure <code className="font-mono">AUTH_DEV_SKIP_VERIFICATION=1</code>.
              </p>
            </div>
          )}
        </section>

        {/* Session */}
        <section className="border border-border rounded-[10px] p-5 bg-background mb-4">
          <h2 className="text-[14px] font-medium text-text-primary mb-3">next-auth session</h2>
          {session?.user ? (
            <div className="space-y-0">
              <Row k="signed in" v="yes" />
              <Row k="user id" v={<code className="font-mono">{session.user.id ?? "—"}</code>} />
              <Row k="email" v={session.user.email ?? "—"} />
              <Row k="name" v={session.user.name ?? "—"} />
              <Row k="role" v={(session.user as { role?: string }).role ?? "—"} />
            </div>
          ) : (
            <p className="text-[12px] text-text-muted">No active session.</p>
          )}
        </section>

        {/* Request signals */}
        <section className="border border-border rounded-[10px] p-5 bg-background mb-4">
          <h2 className="text-[14px] font-medium text-text-primary mb-3">Request signals</h2>
          <div className="space-y-0">
            <Row
              k="x-whop-user-token"
              v={tokenFromHeader ? `${tokenFromHeader.slice(0, 24)}…(redacted)` : "—"}
            />
            <Row
              k="cookie whop_user_token"
              v={tokenFromCookie ? "present (redacted)" : "—"}
            />
            <Row k="origin" v={origin ?? "—"} />
            <Row k="referer" v={referer ?? "—"} />
            <Row
              k="user agent"
              v={<span className="text-[11px]">{userAgent ?? "—"}</span>}
            />
            <Row
              k="whop-named cookies"
              v={whopCookieNames.length ? whopCookieNames.join(", ") : "—"}
            />
            <Row
              k="whop-named headers"
              v={whopHeaderNames.length ? whopHeaderNames.join(", ") : "—"}
            />
          </div>
        </section>

        {/* Env */}
        <section className="border border-border rounded-[10px] p-5 bg-background">
          <h2 className="text-[14px] font-medium text-text-primary mb-3">Env config</h2>
          <div className="space-y-0">
            {Object.entries(envFlags).map(([k, v]) => (
              <Row
                key={k}
                k={k}
                v={
                  <StatusPill
                    ok={!!v}
                    label={typeof v === "boolean" ? (v ? "set" : "unset") : String(v)}
                  />
                }
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
