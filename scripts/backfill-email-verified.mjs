import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);

const before = await sql`SELECT COUNT(*)::int AS n FROM users WHERE email_verified IS NULL`;
console.log(`users with NULL email_verified before: ${before[0].n}`);

const updated = await sql`
  UPDATE users
  SET email_verified = created_at
  WHERE email_verified IS NULL
  RETURNING id
`;
console.log(`rows updated: ${updated.length}`);

const after = await sql`SELECT COUNT(*)::int AS n FROM users WHERE email_verified IS NULL`;
console.log(`users with NULL email_verified after: ${after[0].n}`);
