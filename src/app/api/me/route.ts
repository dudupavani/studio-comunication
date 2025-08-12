// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }
  return NextResponse.json({ ok: true, data: ctx });
}
