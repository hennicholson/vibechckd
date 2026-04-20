import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "vibechckd <noreply@vibechckd.cc>";

// Branded HTML email wrapper
function brandedEmail(params: {
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div style="margin-bottom:32px;">
      <span style="font-size:16px;font-weight:700;color:#171717;letter-spacing:-0.02em;">vibechckd</span>
      <span style="display:inline-block;width:12px;height:12px;background:#171717;border-radius:50%;margin-left:4px;vertical-align:middle;position:relative;top:-1px;">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="white" style="position:absolute;top:2px;left:2px;"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" fill="none"/></svg>
      </span>
    </div>

    <!-- Heading -->
    <h1 style="font-size:22px;font-weight:600;color:#0a0a0a;margin:0 0 16px;line-height:1.3;letter-spacing:-0.02em;">${params.heading}</h1>

    <!-- Body -->
    <div style="font-size:14px;color:#525252;line-height:1.7;margin-bottom:24px;">${params.body}</div>

    ${params.ctaText && params.ctaUrl ? `
    <!-- CTA Button -->
    <a href="${params.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#171717;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">${params.ctaText}</a>
    ` : ""}

    <!-- Footer -->
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e5e5;">
      <p style="font-size:11px;color:#a3a3a3;margin:0;line-height:1.6;">
        ${params.footer || "vibechckd -- The vetted coder marketplace"}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("Email skipped (no RESEND_API_KEY):", params.subject, "->", params.to);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: brandedEmail(params),
    });
    console.log("Email sent:", params.subject, "->", params.to);
  } catch (error) {
    console.error("Email send failed:", error);
    // Non-blocking -- don't fail the API request if email fails
  }
}

// Pre-built email templates
export const emails = {
  welcome: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Welcome to vibechckd",
      heading: `Welcome, ${name}`,
      body: "Your account has been created. You're now part of the vetted coder marketplace.",
      ctaText: "Go to Dashboard",
      ctaUrl: "https://vibechckd.cc/dashboard",
    }),

  applicationSubmitted: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Application received -- vibechckd",
      heading: "We received your application",
      body: `Thanks for applying, ${name}. Our team reviews every application carefully. You'll hear back within 3-5 business days.`,
      ctaText: "View your application",
      ctaUrl: "https://vibechckd.cc/dashboard",
    }),

  applicationApproved: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "You're in! Application approved -- vibechckd",
      heading: `Congratulations, ${name}`,
      body: "Your application has been approved! You're now a verified creator on vibechckd. Set up your profile and portfolio to start getting discovered by clients.",
      ctaText: "Set up your profile",
      ctaUrl: "https://vibechckd.cc/dashboard/profile",
    }),

  applicationRejected: (to: string, name: string) =>
    sendEmail({
      to,
      subject: "Application update -- vibechckd",
      heading: "Application update",
      body: `Hi ${name}, thanks for your interest in vibechckd. After reviewing your application, we're not able to approve it at this time. You're welcome to reapply in the future with updated work samples.`,
    }),

  invoiceCreated: (to: string, description: string, amount: string, payUrl?: string) =>
    sendEmail({
      to,
      subject: `Invoice: ${description} -- vibechckd`,
      heading: "You have a new invoice",
      body: `<p><strong>${description}</strong></p><p style="font-size:24px;font-weight:600;color:#0a0a0a;margin:8px 0;">${amount}</p>`,
      ctaText: payUrl ? "Pay invoice" : undefined,
      ctaUrl: payUrl,
    }),

  paymentReceived: (to: string, amount: string, description: string) =>
    sendEmail({
      to,
      subject: `Payment received: ${amount} -- vibechckd`,
      heading: "Payment received",
      body: `You received a payment of <strong>${amount}</strong> for "${description}". The funds have been added to your balance.`,
      ctaText: "View earnings",
      ctaUrl: "https://vibechckd.cc/dashboard/earnings",
    }),

  withdrawalProcessed: (to: string, amount: string) =>
    sendEmail({
      to,
      subject: `Withdrawal processed: ${amount} -- vibechckd`,
      heading: "Withdrawal processed",
      body: `Your withdrawal of <strong>${amount}</strong> has been initiated. Funds will arrive in 1-3 business days depending on your payout method.`,
      ctaText: "View earnings",
      ctaUrl: "https://vibechckd.cc/dashboard/earnings",
    }),

  passwordReset: (to: string, resetUrl: string) =>
    sendEmail({
      to,
      subject: "Reset your password -- vibechckd",
      heading: "Reset your password",
      body: "Click the button below to reset your password. This link expires in 1 hour.",
      ctaText: "Reset password",
      ctaUrl: resetUrl,
    }),

  emailVerification: (to: string, verifyUrl: string) =>
    sendEmail({
      to,
      subject: "Verify your email -- vibechckd",
      heading: "Verify your email",
      body: "Click the button below to verify your email address.",
      ctaText: "Verify email",
      ctaUrl: verifyUrl,
    }),
};
