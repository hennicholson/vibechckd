// Whop push notifications helper.
//
// When a chat event happens (new message, invoice sent, invoice paid),
// we want to push a Whop-native notification to the recipient's mobile
// app. This is the platform-blessed channel — vs an email or browser
// push, both of which we can fall back to.
//
// The Whop API requires a `company_id` (the app's installed Whop company)
// or `experience_id` to scope the audience. We use `WHOP_COMPANY_ID` from
// env, which is the same company the app's Whop install lives under. The
// `user_ids` filter narrows delivery to specific recipients.
//
// All calls are fire-and-forget: a notification failure never blocks the
// underlying chat write. Errors are logged for observability but swallowed
// so the user-facing path isn't slowed by a Whop API hiccup.

import { getWhopClient } from "@/lib/whop-client";

interface NotifyOpts {
  // Recipients — only Whop user IDs (users.whopUserId values) work here.
  // Non-Whop accounts will be silently skipped.
  whopUserIds: string[];
  title: string;
  content: string;
  // Optional: whose avatar appears as the notification icon (e.g. the
  // sender's). Falls back to the app's avatar.
  iconWhopUserId?: string | null;
  // Deep-link path inside the app, e.g. `/dashboard/inbox?c=<id>` so a tap
  // jumps straight to the conversation. Whop appends this to the app's
  // base path config.
  deepLinkPath?: string | null;
}

export async function notifyWhopUsers(opts: NotifyOpts): Promise<void> {
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!companyId) {
    // No-op when the app isn't fully configured — keeps the dev path
    // (no Whop creds) from spamming errors.
    return;
  }
  const recipients = opts.whopUserIds.filter((id) => !!id);
  if (recipients.length === 0) return;

  try {
    const client = getWhopClient();
    await client.notifications.create({
      company_id: companyId,
      title: opts.title,
      content: opts.content,
      user_ids: recipients,
      icon_user_id: opts.iconWhopUserId ?? null,
      rest_path: opts.deepLinkPath ?? null,
    });
  } catch (err) {
    // Don't propagate — chat write already succeeded. Log so we can
    // diagnose dropped notifications in production.
    console.warn("[whop-notify] notification failed:", err);
  }
}
