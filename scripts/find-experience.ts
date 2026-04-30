// One-shot helper: list every experience our Whop app can see and print
// id + route, so we can find the one matching a known iframe URL route.
//
// Usage:
//   set -a; source .env.local; set +a
//   npx tsx scripts/find-experience.ts
//
// Prints each experience id, name, and any route-like field exposed.

import { Whop } from "@whop/sdk";

async function main() {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!apiKey) throw new Error("WHOP_API_KEY not set");
  if (!companyId) throw new Error("WHOP_COMPANY_ID not set");

  const whop = new Whop({ apiKey: apiKey.replace(/^Bearer /, "") });

  console.log(`Listing experiences for company ${companyId}…\n`);
  let n = 0;
  for await (const exp of whop.experiences.list({ company_id: companyId })) {
    n++;
    console.log(JSON.stringify(exp, null, 2));
    console.log("---");
  }
  if (n === 0) console.log("No experiences found.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
