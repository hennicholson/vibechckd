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
  // Critical scope distinction (per `notifications.md` skill):
  //   - `company_id`: notification reaches ONLY team members (admins /
  //     moderators) of the targeted company. Regular users — the people
  //     who actually receive chat messages — never see it.
  //   - `experience_id`: reaches all users with access to that experience
  //     (i.e. anyone who installed the app via this experience).
  //
  // For chat notifications the recipient is always a regular user, so
  // experience_id is the right scope. We read it from `WHOP_EXPERIENCE_ID`.
  // Fall back to `company_id` only as a degraded path (dev / single-team
  // notifications) — it WILL silently fail to deliver to non-admins.
  const experienceId = process.env.WHOP_EXPERIENCE_ID;
  const companyId = process.env.WHOP_COMPANY_ID;

  if (!experienceId && !companyId) {
    return; // app not configured; no-op
  }

  const recipients = opts.whopUserIds.filter((id) => !!id);
  if (recipients.length === 0) return;

  const params: {
    title: string;
    content: string;
    user_ids: string[];
    icon_user_id?: string | null;
    rest_path?: string | null;
    experience_id?: string;
    company_id?: string;
  } = {
    title: opts.title,
    content: opts.content,
    user_ids: recipients,
    icon_user_id: opts.iconWhopUserId ?? null,
    rest_path: opts.deepLinkPath ?? null,
  };
  if (experienceId) params.experience_id = experienceId;
  else if (companyId) params.company_id = companyId;

  try {
    const client = getWhopClient();
    // Type-cast: SDK's union of two shapes (with experience_id OR company_id)
    // expects the discriminator, but we resolve at runtime.
    await client.notifications.create(
      params as Parameters<typeof client.notifications.create>[0]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[whop-notify] failed (scope=${experienceId ? "experience" : "company"}, recipients=${recipients.length}):`,
      msg
    );
  }
}
