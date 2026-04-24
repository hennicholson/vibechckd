import { z, ZodError } from "zod";

/**
 * Attempts to parse `data` with the given Zod schema.
 * Returns a discriminated-union result suitable for an API 400 response.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { ok: true, data: parsed };
  } catch (err) {
    if (err instanceof ZodError) {
      const error = err.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      return { ok: false, error: error || "Invalid input" };
    }
    return { ok: false, error: "Invalid JSON body" };
  }
}

export { z };
