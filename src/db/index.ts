import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
  console.error("No DATABASE_URL or NETLIFY_DATABASE_URL found");
}

const sql = neon(connectionString || "");
export const db = drizzle(sql, { schema });
