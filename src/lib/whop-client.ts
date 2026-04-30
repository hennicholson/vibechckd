// Singleton Whop SDK client. Re-used across server-side handlers (auth,
// invoices, webhooks, notifications) so we don't re-instantiate on every
// request.
//
// Per the official `sdk-setup.md` skill (~/.agents/skills/whop-dev/rules):
//   - `appID` should be sourced from `NEXT_PUBLIC_WHOP_APP_ID` so client
//     code can reference the same value. Server still falls back to
//     `WHOP_APP_ID` if only that's set.
//   - `webhookKey` must be **base64-encoded** before passing to the SDK.
//     `whopsdk.webhooks.unwrap()` decodes it internally — passing the raw
//     secret leads to silent signature verification failures.
//
// We also export the SDK as `whopsdk` (the canonical import name used
// throughout the skill examples) so call sites read like the docs.

import { Whop } from "@whop/sdk";

let _client: Whop | null = null;

export function getWhopClient(): Whop {
  if (_client) return _client;
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is not configured");
  }
  const rawKey = apiKey.startsWith("Bearer ") ? apiKey.slice(7) : apiKey;
  const rawWebhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  // Base64-encode per skill rule sdk-setup.md L44. `Buffer.from(...).toString("base64")`
  // is the Node equivalent of `btoa(...)` and produces the exact string the
  // SDK expects to decode internally for HMAC verification.
  const webhookKey = rawWebhookSecret
    ? Buffer.from(rawWebhookSecret, "utf-8").toString("base64")
    : null;

  _client = new Whop({
    apiKey: rawKey,
    appID:
      process.env.NEXT_PUBLIC_WHOP_APP_ID ||
      process.env.WHOP_APP_ID ||
      null,
    webhookKey,
  });
  return _client;
}

// Canonical import name used across the Whop docs/skills. Lets call sites
// read `import { whopsdk } from "@/lib/whop-client"` (matching the skill
// examples) without having to call `getWhopClient()` everywhere.
export const whopsdk = new Proxy({} as Whop, {
  get(_target, prop) {
    return getWhopClient()[prop as keyof Whop];
  },
});
