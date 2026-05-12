import sgMail from "@sendgrid/mail";

// SendGrid swap (May 2026). Resend's domain verifier got stuck in `pending`
// for 5+ hours on vibechckd.cc — couldn't unblock real-user signup. SendGrid
// supports single-sender verification (click a link, no DNS) so we can send
// from `noreply@vibechckd.cc` immediately. Same `emails.*` export surface as
// before so callers are untouched.
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// FROM_EMAIL must match the verified sender identity in SendGrid. Default
// matches what we expect users to verify; can be overridden via env.
const FROM_EMAIL = process.env.EMAIL_FROM || "vibechckd <noreply@vibechckd.cc>";
const APP_URL = process.env.NEXT_PUBLIC_URL || "https://vibechckd.cc";

// Parse "Display Name <email@host>" into { name, email } for SendGrid which
// prefers the structured object form over the joined string.
function parseFrom(s: string): { email: string; name?: string } {
  const m = s.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1], email: m[2] };
  return { email: s.trim() };
}

// Escape user-controlled strings before embedding in HTML.
// Apply to any value that originates from user input or DB fields that
// could contain control characters.
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ─────────────────────────────────────────────────────────────────────────
// Branded email shell
//
// Goals:
//   • Match the dashboard's typographic scale (20px h1, 14px body, mono
//     mark for "VETTED" tag).
//   • Render correctly in dark/light email clients (Gmail/Outlook/Apple).
//   • Inline-only CSS — email clients drop <style> blocks selectively;
//     attribute-style styles always apply.
//   • Single 600px card on neutral bg so the email reads like a real
//     product surface, not a transactional alert.
//   • Wordmark uses the same visual as the dashboard sidebar: word +
//     verified seal pip beside it.
// ─────────────────────────────────────────────────────────────────────────
function brandedEmail(params: {
  preheader?: string;
  kicker?: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  // Optional verbose "If the button doesn't work, paste this URL" line.
  ctaPlain?: boolean;
  footer?: string;
}): string {
  const {
    preheader,
    kicker,
    heading,
    body,
    ctaText,
    ctaUrl,
    ctaPlain = true,
    footer,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;color:#171717;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f5;">${escapeHtml(preheader)}</div>` : ""}

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

          <!-- Wordmark -->
          <tr>
            <td style="padding:0 4px 24px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:16px;font-weight:700;color:#171717;letter-spacing:-0.02em;line-height:1;padding-right:6px;">vibechckd</td>
                  <!-- Verified seal — black pill with inset checkmark. SVG inlined for client compat. -->
                  <td style="vertical-align:middle;line-height:0;">
                    <span style="display:inline-block;width:14px;height:14px;background:#171717;border-radius:50%;position:relative;">
                      <span style="display:inline-block;position:absolute;top:3px;left:3px;width:8px;height:8px;">
                        <svg width="8" height="8" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                          <path d="M5 13l4 4L19 7" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;padding:36px 32px 32px 32px;">
              ${kicker ? `
              <div style="font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#a3a3a3;margin-bottom:14px;">${escapeHtml(kicker)}</div>
              ` : ""}

              <h1 style="margin:0 0 14px 0;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:#171717;">${escapeHtml(heading)}</h1>

              <!-- Body: callers pre-escape user substrings. Markup we author (<p>, <strong>, <em>) passes through. -->
              <div style="font-size:14px;line-height:1.65;color:#525252;">${body}</div>

              ${ctaText && ctaUrl ? `
              <div style="margin-top:28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#171717;border-radius:10px;">
                      <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:-0.005em;">${escapeHtml(ctaText)}</a>
                    </td>
                  </tr>
                </table>
              </div>
              ` : ""}

              ${ctaText && ctaUrl && ctaPlain ? `
              <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f0f0f0;">
                <p style="margin:0 0 6px 0;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:0.06em;text-transform:uppercase;color:#a3a3a3;">If the button doesn't work</p>
                <a href="${escapeHtml(ctaUrl)}" target="_blank" style="font-size:12px;color:#525252;word-break:break-all;text-decoration:underline;text-decoration-color:#d4d4d4;">${escapeHtml(ctaUrl)}</a>
              </div>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 4px 0 4px;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#a3a3a3;line-height:1.6;">
                ${escapeHtml(footer || "vibechckd — the vetted coder marketplace.")}
              </p>
              <p style="margin:0;font-size:11px;color:#a3a3a3;line-height:1.6;">
                <a href="${escapeHtml(APP_URL)}" target="_blank" style="color:#a3a3a3;text-decoration:underline;text-decoration-color:#e5e5e5;">${escapeHtml(APP_URL.replace(/^https?:\/\//, ""))}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  preheader?: string;
  kicker?: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaPlain?: boolean;
  footer?: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("Email skipped (no SENDGRID_API_KEY):", params.subject, "->", params.to);
    return;
  }

  try {
    await sgMail.send({
      from: parseFrom(FROM_EMAIL),
      to: params.to,
      subject: params.subject,
      html: brandedEmail(params),
    });
    console.log("Email sent:", params.subject, "->", params.to);
  } catch (error) {
    // SendGrid throws { response: { body: { errors: [...] } } } — surface
    // the actual reason so silent failures get caught in function logs.
    const sgErr = error as { response?: { body?: unknown }; message?: string };
    console.error(
      "Email send failed:",
      sgErr?.response?.body || sgErr?.message || error
    );
    // Non-blocking — don't fail the API request if email fails
  }
}

// Pre-built email templates
//
// Voice rules (match dashboard tone):
//   • Specific, action-oriented, never corporate.
//   • Subject = action + product tag ("Verify your email · vibechckd").
//   • Kicker = mono uppercase short label, sets context at-a-glance.
//   • Preheader = first 90 chars that show in the inbox preview row.
export const emails = {
  welcome: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Welcome to vibechckd",
      preheader: "You're in. Here's where you go next.",
      kicker: "Welcome",
      heading: `Welcome in, ${escapeHtml(name.split(" ")[0] || name)}`,
      body: `<p style="margin:0 0 12px 0;">You're part of the vetted coder marketplace. Set up your profile, browse work, and start shipping.</p><p style="margin:0;">Click below to land in your dashboard.</p>`,
      ctaText: "Open dashboard",
      ctaUrl: `${APP_URL}/dashboard`,
    }),

  applicationSubmitted: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Application received · vibechckd",
      preheader: "We're reviewing your work. You'll hear back within a few days.",
      kicker: "Application",
      heading: "We got it",
      body: `<p style="margin:0 0 12px 0;">Thanks for applying, <strong style="color:#171717;">${escapeHtml(name.split(" ")[0] || name)}</strong>. A human is reading every application — not a bot.</p><p style="margin:0;">Expect a decision within 3–5 business days.</p>`,
      ctaText: "View status",
      ctaUrl: `${APP_URL}/dashboard/application`,
    }),

  applicationApproved: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "You're vibechckd — application approved",
      preheader: "You're verified. Set up your profile and start getting found.",
      kicker: "Vetted",
      heading: `You're in, ${escapeHtml(name.split(" ")[0] || name)}`,
      body: `<p style="margin:0 0 12px 0;">Your application's approved. You're now a <strong style="color:#171717;">vetted</strong> creator on vibechckd.</p><p style="margin:0;">Polish your profile, drop your best work in the portfolio, and you're discoverable to clients today.</p>`,
      ctaText: "Set up your profile",
      ctaUrl: `${APP_URL}/dashboard/profile`,
    }),

  applicationRejected: (to: string, name: string, reviewerNotes?: string | null) => {
    const notes = reviewerNotes
      ? `<div style="margin-top:18px;padding:14px 16px;background:#fafafa;border-left:3px solid #e5e5e5;border-radius:4px;"><p style="margin:0 0 4px 0;font-size:10px;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#a3a3a3;">From the reviewer</p><p style="margin:0;font-size:13px;color:#525252;line-height:1.6;">${escapeHtml(reviewerNotes)}</p></div>`
      : "";
    return sendEmail({
      to,
      subject: "Application update · vibechckd",
      preheader: "Not this round — you can reapply when you've got more to show.",
      kicker: "Application",
      heading: "Not this round",
      body: `<p style="margin:0 0 12px 0;">Hey ${escapeHtml(name.split(" ")[0] || name)} — thanks for applying to vibechckd. After review, we're not able to approve this application.</p><p style="margin:0;">You can reapply anytime with updated work. We weigh craft and recent shipped projects most.</p>${notes}`,
      ctaText: "Reapply",
      ctaUrl: `${APP_URL}/apply`,
    });
  },

  invoiceCreated: (to: string, description: string, amount: string, payUrl?: string) =>
    sendEmail({
      to,
      subject: `Invoice: ${description} · vibechckd`,
      preheader: `${amount} — ${description}`,
      kicker: "Invoice",
      heading: "You've got a new invoice",
      body: `<p style="margin:0 0 16px 0;font-size:13px;color:#525252;">${escapeHtml(description)}</p><p style="margin:0;font-size:32px;font-weight:600;letter-spacing:-0.02em;color:#171717;font-variant-numeric:tabular-nums;">${escapeHtml(amount)}</p><p style="margin:14px 0 0 0;font-size:12px;color:#a3a3a3;">Pay with card, ACH, or your Whop balance.</p>`,
      ctaText: payUrl ? "Pay invoice" : undefined,
      ctaUrl: payUrl,
    }),

  paymentReceived: (to: string, amount: string, description: string) =>
    sendEmail({
      to,
      subject: `Payment received · ${amount}`,
      preheader: `${amount} just landed in your balance.`,
      kicker: "Paid",
      heading: "Payment received",
      body: `<p style="margin:0 0 12px 0;">Funds for "<strong style="color:#171717;">${escapeHtml(description)}</strong>" just landed.</p><p style="margin:0 0 14px 0;font-size:32px;font-weight:600;letter-spacing:-0.02em;color:#22c55e;font-variant-numeric:tabular-nums;">${escapeHtml(amount)}</p><p style="margin:0;font-size:12px;color:#a3a3a3;">Sitting in your balance — cash out anytime.</p>`,
      ctaText: "View earnings",
      ctaUrl: `${APP_URL}/dashboard/earnings`,
    }),

  withdrawalProcessed: (to: string, amount: string) =>
    sendEmail({
      to,
      subject: `Withdrawal in flight · ${amount}`,
      preheader: `${amount} on its way to your payout method.`,
      kicker: "Withdrawal",
      heading: "Cashout in flight",
      body: `<p style="margin:0 0 12px 0;"><strong style="color:#171717;">${escapeHtml(amount)}</strong> is on its way to your linked payout method.</p><p style="margin:0;">Arrival depends on the method — typically 1–3 business days.</p>`,
      ctaText: "View earnings",
      ctaUrl: `${APP_URL}/dashboard/earnings`,
    }),

  passwordReset: (to: string, resetUrl: string) =>
    sendEmail({
      to,
      subject: "Reset your password · vibechckd",
      preheader: "Link expires in 1 hour. If you didn't request it, ignore this email.",
      kicker: "Password",
      heading: "Reset your password",
      body: `<p style="margin:0 0 12px 0;">Click below to pick a new password. The link is good for the next hour.</p><p style="margin:0;font-size:12px;color:#a3a3a3;">If you didn't ask for this, ignore the email — your account stays as-is.</p>`,
      ctaText: "Reset password",
      ctaUrl: resetUrl,
    }),

  emailVerification: (to: string, verifyUrl: string) =>
    sendEmail({
      to,
      subject: "Verify your email · vibechckd",
      preheader: "One click to confirm this email and you're set.",
      kicker: "Verify",
      heading: "Confirm your email",
      body: `<p style="margin:0 0 12px 0;">Click the button below to verify this is you. Takes one tap.</p><p style="margin:0;font-size:12px;color:#a3a3a3;">Link expires in 24 hours. If you didn't sign up, you can safely ignore this.</p>`,
      ctaText: "Verify email",
      ctaUrl: verifyUrl,
    }),
};
