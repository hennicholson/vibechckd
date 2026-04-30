// Apply a SQL migration file via neon's HTTP endpoint. Drizzle-kit's
// `migrate` command requires the websocket driver which we don't ship,
// so this script bridges the gap: it reads a `.sql` file, splits on
// drizzle's `--> statement-breakpoint` markers, and runs each statement
// individually via the neon HTTP driver (auto-commits per request).
//
// Usage:
//   npx tsx scripts/apply-migration.ts drizzle/0012_colorful_eternals.sql

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/apply-migration.ts <path-to-sql>");
    process.exit(1);
  }
  const conn = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!conn) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = neon(conn);
  const path = resolve(file);
  const raw = readFileSync(path, "utf8");

  // drizzle-kit emits `--> statement-breakpoint` between statements. Each
  // chunk after the split is one SQL statement. Drop empty chunks.
  const statements = raw
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying ${path} — ${statements.length} statements`);

  let applied = 0;
  for (const stmt of statements) {
    try {
      // neon-http accepts a single SQL string; multi-statement is allowed
      // for DDL but we already split, so we send one at a time. The neon
      // tagged-template form is for parameterised queries; for raw SQL we
      // call sql.query() to bypass parameter parsing.
      await (sql as unknown as { query: (s: string) => Promise<unknown> }).query(stmt);
      applied++;
      // Print a brief signature so progress is visible.
      const head = stmt.replace(/\s+/g, " ").slice(0, 80);
      console.log(`  ✓ [${applied}/${statements.length}] ${head}${stmt.length > 80 ? "…" : ""}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Migrations are written to be idempotent — `IF NOT EXISTS`,
      // `ON CONFLICT DO NOTHING`, etc. — but Postgres still throws on
      // some classes of duplicate (e.g. existing enum values, existing
      // FK constraints). Treat those as warnings, not failures.
      const benign =
        msg.includes("already exists") ||
        msg.includes("duplicate object") ||
        msg.includes("duplicate column") ||
        msg.includes("already a member");
      if (benign) {
        const head = stmt.replace(/\s+/g, " ").slice(0, 80);
        console.log(`  ↪ skipped (already applied): ${head}${stmt.length > 80 ? "…" : ""}`);
        applied++;
        continue;
      }
      console.error(`✗ Statement failed:\n${stmt}\n\nError: ${msg}`);
      process.exit(1);
    }
  }
  console.log(`Done — ${applied}/${statements.length} statements applied.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
