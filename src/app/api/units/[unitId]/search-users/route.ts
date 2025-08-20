import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(req: Request, ctx: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const auth = await getAuthContext();
  if (!auth?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!auth.orgId) return NextResponse.json({ error: "no-org" }, { status: 400 });

  const supabase = await createClient();
  const { data: unit, error: unitErr } = await supabase
    .from("units").select("id, org_id").eq("id", unitId).maybeSingle();
  if (unitErr || !unit || unit.org_id !== auth.orgId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: current, error: curErr } = await supabase
    .from("unit_members").select("user_id").eq("unit_id", unitId);
  if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
  const exclude = (current ?? []).map((r: any) => r.user_id);

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("org_id", auth.orgId)
    .not("id", "in", `(${exclude.length ? exclude.map((x:string)=>`"${x}"`).join(",") : ""})`);

  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}