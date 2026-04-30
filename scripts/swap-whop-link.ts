// One-shot: move the Whop user link from one local user record to another.
//
// Use case: King Rocco's Whop account is currently linked to the wrong
// vibechckd user record. We want to detach it and re-attach to Henry's
// vibechckd account so Henry's `users.whopUserId` matches the Whop SSO
// identity going forward.
//
// Usage:
//   set -a; source .env.local; set +a
//   npx tsx scripts/swap-whop-link.ts list                        # show candidates
//   npx tsx scripts/swap-whop-link.ts swap <fromEmail> <toEmail>  # do the swap

import { neon } from "@neondatabase/serverless";

const conn = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
if (!conn) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(conn);

async function listCandidates() {
  const rows = (await sql`
    SELECT id, email, name, "whop_user_id", "role", "created_at"
    FROM users
    WHERE
      LOWER(email) LIKE '%henry%'
      OR LOWER(email) LIKE '%nicholson%'
      OR LOWER(name) LIKE '%king rocco%'
      OR LOWER(name) LIKE '%henry%'
      OR "whop_user_id" IS NOT NULL
    ORDER BY "created_at" DESC
    LIMIT 30
  `) as Array<{
    id: string;
    email: string | null;
    name: string | null;
    whop_user_id: string | null;
    role: string | null;
    created_at: string;
  }>;
  if (rows.length === 0) {
    console.log("No matching users found.");
    return;
  }
  for (const r of rows) {
    console.log(
      `${r.id} | role=${r.role} | whop=${r.whop_user_id ?? "—"} | email=${r.email ?? "—"} | name=${r.name ?? "—"}`
    );
  }
}

async function swap(fromEmail: string, toEmail: string) {
  const fromRows = (await sql`
    SELECT id, email, name, "whop_user_id" FROM users WHERE LOWER(email) = ${fromEmail.toLowerCase()} LIMIT 1
  `) as Array<{ id: string; email: string; name: string | null; whop_user_id: string | null }>;
  const toRows = (await sql`
    SELECT id, email, name, "whop_user_id" FROM users WHERE LOWER(email) = ${toEmail.toLowerCase()} LIMIT 1
  `) as Array<{ id: string; email: string; name: string | null; whop_user_id: string | null }>;

  const from = fromRows[0];
  const to = toRows[0];
  if (!from) {
    console.error(`No user with email ${fromEmail}`);
    process.exit(1);
  }
  if (!to) {
    console.error(`No user with email ${toEmail}`);
    process.exit(1);
  }
  if (!from.whop_user_id) {
    console.error(`Source user ${from.email} has no whop_user_id to move.`);
    process.exit(1);
  }

  const whopUserId = from.whop_user_id;
  console.log(
    `Moving whop_user_id=${whopUserId} from ${from.email} (${from.id}) → ${to.email} (${to.id})`
  );

  // Two-step because of unique index on whop_user_id: null out source first,
  // then set destination. Both as a logical pair — if the second step
  // fails we'd have orphaned the link, but neon-http auto-commits each
  // statement so we accept that risk for this one-off admin op.
  await sql`UPDATE users SET "whop_user_id" = NULL WHERE id = ${from.id}`;
  await sql`UPDATE users SET "whop_user_id" = ${whopUserId}, role = 'admin' WHERE id = ${to.id}`;

  console.log("Done. Verifying:");
  const verify = (await sql`
    SELECT id, email, name, "whop_user_id", role FROM users WHERE id IN (${from.id}, ${to.id})
  `) as Array<{ id: string; email: string; name: string | null; whop_user_id: string | null; role: string }>;
  for (const v of verify) {
    console.log(
      `  ${v.id} | role=${v.role} | whop=${v.whop_user_id ?? "—"} | email=${v.email}`
    );
  }
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "list") {
  listCandidates().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (cmd === "swap" && rest.length === 2) {
  swap(rest[0], rest[1]).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.error("Usage:");
  console.error("  npx tsx scripts/swap-whop-link.ts list");
  console.error("  npx tsx scripts/swap-whop-link.ts swap <fromEmail> <toEmail>");
  process.exit(1);
}
