import * as queries from "./queries";

export async function getCoders() {
  const dbCoders = await queries.getAllVerifiedCoders();
  return dbCoders;
}

export async function getCoderBySlug(slug: string) {
  const coder = await queries.getCoderBySlug(slug);
  return coder ?? null;
}
