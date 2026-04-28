import crypto from "crypto";
import { db } from "@/db";
import { users, coderProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyUserToken } from "@whop/sdk/lib/verify-user-token.js";
import { getWhopClient } from "@/lib/whop-client";

// ── Whop user-token verification ──
//
// When the app is loaded inside the Whop iframe, Whop attaches a JWT to the
// `x-whop-user-token` request header (signed with their published ES256 key).
// We verify the JWT signature, then fetch the full user profile via the API
// using our own app API key. We never trust client-declared identity.
//
// Dev override: with AUTH_DEV_SKIP_VERIFICATION=1 we accept a synthetic
// profile so you can iterate locally without standing up Whop's dev proxy.

export interface WhopUserProfile {
  whopUserId: string;
  email: string | null;
  name: string | null;
  image: string | null;
  whopCompanyId: string | null;
}

export interface VerifyResult {
  profile: WhopUserProfile;
  source: "whop-jwt" | "dev-override";
  appId: string | null;
}

export async function verifyWhopUserToken(
  token: string,
  devOverride?: Partial<WhopUserProfile>
): Promise<WhopUserProfile> {
  const result = await verifyWhopUserTokenDetailed(token, devOverride);
  return result.profile;
}

export async function verifyWhopUserTokenDetailed(
  token: string,
  devOverride?: Partial<WhopUserProfile>
): Promise<VerifyResult> {
  const isDev = process.env.NODE_ENV !== "production";
  const allowDevOverride = isDev && process.env.AUTH_DEV_SKIP_VERIFICATION === "1";

  if (allowDevOverride && devOverride?.whopUserId) {
    return {
      source: "dev-override",
      appId: process.env.WHOP_APP_ID ?? null,
      profile: {
        whopUserId: devOverride.whopUserId,
        email: devOverride.email ?? `${devOverride.whopUserId}@whop.dev`,
        name: devOverride.name ?? null,
        image: devOverride.image ?? null,
        whopCompanyId: devOverride.whopCompanyId ?? null,
      },
    };
  }

  if (!token || typeof token !== "string") {
    throw new Error("Whop user token missing");
  }

  const expectedAppId = process.env.WHOP_APP_ID || null;

  // 1. Verify the iframe JWT signature/issuer first WITHOUT enforcing audience.
  //    Then enforce audience ourselves so the error message is informative
  //    when env WHOP_APP_ID drifts away from the running Whop app's id.
  const claims = await verifyUserToken(token, {});
  if (!claims?.userId) throw new Error("Whop token has no user id");

  if (expectedAppId && claims.appId !== expectedAppId) {
    // In dev we accept the discovered app id and just log so iteration isn't
    // blocked by an env mismatch — log so the operator can pin env to match.
    if (isDev) {
      console.warn(
        `[whop-auth] WHOP_APP_ID mismatch (env=${expectedAppId} token=${claims.appId}). Accepting token in dev. Update .env.local to silence.`
      );
    } else {
      throw new Error(
        `Whop token audience ${claims.appId} does not match WHOP_APP_ID ${expectedAppId}`
      );
    }
  }

  // 2. Fetch the actual user profile using our app API key.
  const whop = getWhopClient();
  let user: Awaited<ReturnType<typeof whop.users.retrieve>>;
  try {
    user = await whop.users.retrieve(claims.userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(`Whop user fetch failed: ${msg}`);
  }

  // The Whop SDK's User type is intentionally narrow; the live response has
  // more fields than the type declares (username, email, profile_picture).
  // Cast once through `unknown` to a loose shape so we can read them safely.
  const u = user as unknown as {
    username?: string;
    name?: string;
    email?: string;
    profile_picture?: { source_url?: string };
  };
  const username = typeof u.username === "string" ? u.username : null;
  const name = typeof u.name === "string" ? u.name : username;
  const email = typeof u.email === "string" ? u.email : null;
  const image = u.profile_picture?.source_url ?? null;

  return {
    source: "whop-jwt",
    appId: claims.appId,
    profile: {
      whopUserId: claims.userId,
      email,
      name,
      image,
      whopCompanyId: null,
    },
  };
}

/**
 * Find an existing user by whopUserId, then by email (link existing email/password
 * accounts to Whop SSO). If no match, create a new user with no password set —
 * the user can later add a password from /dashboard/settings to enable external login.
 */
export async function findOrCreateWhopUser(profile: WhopUserProfile) {
  const [byWhop] = await db
    .select()
    .from(users)
    .where(eq(users.whopUserId, profile.whopUserId))
    .limit(1);

  if (byWhop) {
    // Refresh display fields if Whop has newer info; never touch passwordHash.
    const patch: Partial<typeof users.$inferInsert> = {};
    if (profile.email && byWhop.email !== profile.email) patch.email = profile.email;
    if (profile.name && byWhop.name !== profile.name) patch.name = profile.name;
    if (profile.image && byWhop.image !== profile.image) patch.image = profile.image;
    if (profile.whopCompanyId && byWhop.whopCompanyId !== profile.whopCompanyId) {
      patch.whopCompanyId = profile.whopCompanyId;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(users).set(patch).where(eq(users.id, byWhop.id));
    }
    return { id: byWhop.id, role: byWhop.role, isNew: false as const };
  }

  if (profile.email) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1);
    if (byEmail) {
      // Link the existing account to this Whop identity.
      await db
        .update(users)
        .set({
          whopUserId: profile.whopUserId,
          ...(profile.whopCompanyId ? { whopCompanyId: profile.whopCompanyId } : {}),
          // Mark the email verified — Whop SSO is itself proof of ownership.
          ...(byEmail.emailVerified ? {} : { emailVerified: new Date() }),
        })
        .where(eq(users.id, byEmail.id));
      return { id: byEmail.id, role: byEmail.role, isNew: false as const };
    }
  }

  // Create a fresh user. Default role: client (Whop creators arriving via the
  // marketplace are buyers by default). Coders can change this from settings.
  const placeholderEmail =
    profile.email || `whop_${profile.whopUserId}@vibechckd.local`;

  const [created] = await db
    .insert(users)
    .values({
      email: placeholderEmail,
      name: profile.name,
      image: profile.image,
      whopUserId: profile.whopUserId,
      whopCompanyId: profile.whopCompanyId,
      // Whop SSO IS verification — skip the email-link gate.
      emailVerified: new Date(),
      role: "client",
    })
    .returning({ id: users.id, role: users.role });

  return { id: created.id, role: created.role, isNew: true as const };
}

// ── Handoff token (HMAC-signed) ──
//
// The /api/auth/whop-handoff endpoint verifies the Whop token and resolves a
// userId server-side, then issues a short-lived signed handoff that the client
// passes back to next-auth's `whop` Credentials provider. NextAuth's Credentials
// flow can't itself call Whop's API mid-request reliably, so we split the work.

const HANDOFF_TTL_MS = 60_000; // 60 seconds — long enough for slow networks, short enough to be safe.

function hmacSecret() {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not configured");
  return s;
}

function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

export function signHandoff(payload: { userId: string; expiresAt?: number }) {
  const exp = payload.expiresAt ?? Date.now() + HANDOFF_TTL_MS;
  const body = JSON.stringify({ userId: payload.userId, exp });
  const sig = crypto
    .createHmac("sha256", hmacSecret())
    .update(body)
    .digest("base64url");
  return `${b64url(body)}.${sig}`;
}

export function verifyHandoff(token: string): { userId: string } | null {
  if (!token || typeof token !== "string") return null;
  const [bodyEnc, sig] = token.split(".");
  if (!bodyEnc || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(bodyEnc, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", hmacSecret())
    .update(body)
    .digest("base64url");
  // Constant-time compare.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let parsed: { userId: string; exp: number };
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed.userId || typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    return null;
  }
  return { userId: parsed.userId };
}

// Marker used by the dashboard settings UI to know whether to show the
// "Set password to enable external login" CTA. Re-exporting from auth lib so
// callers can keep imports clean.
export async function userHasPassword(userId: string): Promise<boolean> {
  const [u] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !!u?.passwordHash;
}

// Ensure a coder profile row exists when a Whop SSO user opts to apply as a coder.
// Currently unused by the SSO auto-create path (we default to "client") but kept
// here so the upgrade-to-coder flow has one place to do it.
export async function ensureCoderProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(coderProfiles)
    .where(eq(coderProfiles.userId, userId))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(coderProfiles)
    .values({ userId, status: "draft" })
    .returning({ id: coderProfiles.id });
  return created.id;
}
