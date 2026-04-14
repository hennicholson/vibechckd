import {
  coders as mockCoders,
  getCoderBySlug as mockGetBySlug,
} from "./mock-data";
import * as queries from "./queries";

export async function getCoders() {
  try {
    const dbCoders = await queries.getAllVerifiedCoders();
    return dbCoders.length > 0 ? dbCoders : mockCoders;
  } catch {
    return mockCoders;
  }
}

export async function getCoderBySlug(slug: string) {
  try {
    const coder = await queries.getCoderBySlug(slug);
    return coder ?? mockGetBySlug(slug);
  } catch {
    return mockGetBySlug(slug);
  }
}
