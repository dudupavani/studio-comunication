// src/lib/messages/api-helpers.ts
import { NextResponse } from "next/server";

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleRouteError(err: unknown) {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as any).status ?? 500;
    const message = (err as any).message ?? "Unexpected error";
    const code = status === 401 || status === 403 ? "auth_error" : "internal_error";
    return errorResponse(status, code, message);
  }
  console.error("MESSAGES route error:", err);
  return errorResponse(500, "internal_error", "Unexpected error");
}

export function parsePagination(searchParams: URLSearchParams, {
  defaultLimit = 30,
  maxLimit = 100,
}: { defaultLimit?: number; maxLimit?: number } = {}) {
  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor") ?? undefined;

  const limitRaw = limitParam ? Number(limitParam) : defaultLimit;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), maxLimit)
    : defaultLimit;

  return { limit, cursor: cursorParam };
}
