// src/app/api/orgs/[slug]/units/[unitId]/available-members/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; unitId: string } }
) {
  const supabase = await createClient();
  const orgId = params.slug;
  const unitId = params.unitId;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // usuários da org que AINDA não estão na unit
  const { data: orgUsers, error: orgErr } = await supabase
    .from("org_members")
    .select("user_id, profiles:profiles!inner(id, full_name, email)")
    .eq("org_id", orgId);

  if (orgErr) {
    console.error("org members error:", orgErr);
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  const { data: unitUsers, error: unitErr } = await supabase
    .from("unit_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("unit_id", unitId);

  if (unitErr) {
    console.error("unit members error:", unitErr);
    return NextResponse.json({ error: unitErr.message }, { status: 500 });
  }

  const unitUserIds = new Set((unitUsers ?? []).map((u) => u.user_id));
  const available = (orgUsers ?? []).filter((m) => !unitUserIds.has(m.user_id));

  return NextResponse.json(available);
}
