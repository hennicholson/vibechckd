// Singleton Whop SDK client. Reads `WHOP_API_KEY`, `WHOP_APP_ID`, and
// `WHOP_WEBHOOK_SECRET` from env. Re-used across server-side handlers (auth,
// invoices, webhooks) so we don't re-instantiate on every request.

import { Whop } from "@whop/sdk";

let _client: Whop | null = null;

export function getWhopClient(): Whop {
  if (_client) return _client;
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    throw new Error("WHOP_API_KEY is not configured");
  }
  // SDK wraps the key with `Bearer ${apiKey}` itself (see node_modules/@whop/sdk/client.js).
  // Pass the raw key — strip any leading "Bearer " in case env still has it.
  const rawKey = apiKey.startsWith("Bearer ") ? apiKey.slice(7) : apiKey;
  _client = new Whop({
    apiKey: rawKey,
    appID: process.env.WHOP_APP_ID || null,
    webhookKey: process.env.WHOP_WEBHOOK_SECRET || null,
  });
  return _client;
}
