// src/app/api/orgs/route.ts
import { NextResponse } from "next/server";
import { listMyOrgs } from "@/lib/actions/orgs";

export async function GET() {
  const res = await listMyOrgs();
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: res.data });
}
