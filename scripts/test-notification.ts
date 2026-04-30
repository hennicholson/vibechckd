// Send a test Whop notification to confirm the experience_id + scope is
// configured right. Prints the SDK response or the exact error so we can
// debug "notifications not arriving" without combing through prod logs.
//
// Usage:
//   set -a; source .env.local; set +a
//   npx tsx scripts/test-notification.ts user_xxxxx [user_yyyyy ...]
//
// Args are Whop user ids. The script tries `experience_id` first, then
// falls back to `company_id`, and reports each attempt's outcome.

import { Whop } from "@whop/sdk";

async function main() {
  const apiKey = process.env.WHOP_API_KEY;
  const expId = process.env.WHOP_EXPERIENCE_ID;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!apiKey) throw new Error("WHOP_API_KEY not set");
  const whop = new Whop({ apiKey: apiKey.replace(/^Bearer /, "") });

  const recipients = process.argv.slice(2);
  if (recipients.length === 0) {
    console.error("Pass at least one Whop user id (e.g. user_xxxxx)");
    process.exit(1);
  }

  console.log(`Recipients: ${recipients.join(", ")}`);
  console.log(`WHOP_EXPERIENCE_ID: ${expId ?? "(unset)"}`);
  console.log(`WHOP_COMPANY_ID: ${companyId ?? "(unset)"}`);
  console.log();

  if (expId) {
    console.log(`Attempting via experience_id=${expId}…`);
    try {
      const res = await whop.notifications.create({
        experience_id: expId,
        title: "vibechckd test push",
        content: "If you see this, the experience scope works.",
        user_ids: recipients,
      });
      console.log("OK:", res);
    } catch (err) {
      console.error("FAILED via experience_id:", err);
    }
    console.log();
  }

  if (companyId) {
    console.log(`Attempting via company_id=${companyId}…`);
    try {
      const res = await whop.notifications.create({
        company_id: companyId,
        title: "vibechckd test push (company scope)",
        content: "If you see THIS instead, the recipient is a team member.",
        user_ids: recipients,
      });
      console.log("OK:", res);
    } catch (err) {
      console.error("FAILED via company_id:", err);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
