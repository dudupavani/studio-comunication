import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(_: Request, ctx: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await ctx.params;
  const auth = await getAuthContext();
  if (!auth?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!auth.orgId) return NextResponse.json({ error: "no-org" }, { status: 400 });

  const supabase = await createClient();
  const { data: unit, error: unitErr } = await supabase
    .from("units").select("id, org_id").eq("id", unitId).maybeSingle();
  if (unitErr || !unit || unit.org_id !== auth.orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("unit_members")
    .select("id, user_id, role, created_at, profiles:profiles!unit_members_user_id_fkey(full_name,email,avatar_url)")
    .eq("unit_id", unitId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}