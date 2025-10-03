import { z, ZodSchema } from "zod";

export async function parseJson<T = unknown>(
  req: Request,
  maxSize = 1024 * 50
): Promise<T> {
  const text = await req.text();

  if (text.length > maxSize) {
    throw new Error("Request body too large");
  }

  return JSON.parse(text) as T;
}

export function validateBody<T>(schema: ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, issues: result.error.issues };
}

export function validateQuery<T>(schema: ZodSchema<T>, url: URL) {
  const params = Object.fromEntries(url.searchParams.entries());
  const result = schema.safeParse(params);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, issues: result.error.issues };
}
