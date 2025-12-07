// src/app/api/units/[unitId]/members/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

// Regex para diferenciar id (uuid) de slug
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUnitByParam(
  supabase: any,
  unitParam: string
): Promise<{ unit: any; unitErr: any }> {
  const col = UUID_V4.test(unitParam) ? "id" : "slug";
  const { data, error } = await supabase
    .from("units")
    .select("id, org_id, slug, name")
    .eq(col, unitParam)
    .maybeSingle();
  return { unit: data, unitErr: error };
}

// GET → lista membros da unidade
export async function GET(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/members">
) {
  try {
    const { unitId: unitParam } = await context.params;
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ error: "no-org" }, { status: 400 });

    const supabase = await createClient();
    const { unit, unitErr } = await resolveUnitByParam(supabase, unitParam);
    if (unitErr || !unit)
      return NextResponse.json({ error: "unit-not-found" }, { status: 404 });
    if (unit.org_id !== auth.orgId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { data, error } = await supabase
      .from("unit_members")
      .select(
        "unit_id, user_id, created_at, profiles:profiles!unit_members_user_id_fkey(full_name, avatar_url)"
      )
      .eq("unit_id", unit.id)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ members: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "internal-error" },
      { status: 500 }
    );
  }
}

// POST → vincular usuário à unidade
export async function POST(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/members">
) {
  try {
    const { unitId: unitParam } = await context.params;
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ error: "no-org" }, { status: 400 });

    const { userId } = await req.json().catch(() => ({}));
    if (!userId)
      return NextResponse.json({ error: "userId-required" }, { status: 400 });

    const supabase = await createClient();
    const { unit, unitErr } = await resolveUnitByParam(supabase, unitParam);
    if (unitErr || !unit)
      return NextResponse.json({ error: "unit-not-found" }, { status: 404 });
    if (unit.org_id !== auth.orgId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // garantir que o usuário pertence à mesma org
    const { data: orgMember, error: orgMemberErr } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", unit.org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (orgMemberErr)
      return NextResponse.json(
        { error: orgMemberErr.message },
        { status: 500 }
      );
    if (!orgMember)
      return NextResponse.json({ error: "user-not-in-org" }, { status: 400 });

    // evitar duplicado
    const { data: existing } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("unit_id", unit.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing)
      return NextResponse.json({ ok: true, status: "already-member" });

    // inserir vínculo
    const payload = {
      unit_id: unit.id,
      user_id: userId,
      org_id: unit.org_id,
    };
    const { error: insertErr } = await supabase
      .from("unit_members")
      .insert(payload);
    if (insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: "added" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "internal-error" },
      { status: 500 }
    );
  }
}

// DELETE → remover usuário da unidade
export async function DELETE(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/members">
) {
  try {
    const { unitId: unitParam } = await context.params;
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ error: "no-org" }, { status: 400 });

    const url = new URL(req.url);
    const qpUserId = url.searchParams.get("userId");
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId ?? qpUserId;
    if (!userId)
      return NextResponse.json({ error: "userId-required" }, { status: 400 });

    const supabase = await createClient();
    const { unit, unitErr } = await resolveUnitByParam(supabase, unitParam);
    if (unitErr || !unit)
      return NextResponse.json({ error: "unit-not-found" }, { status: 404 });
    if (unit.org_id !== auth.orgId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { error: delErr } = await supabase
      .from("unit_members")
      .delete()
      .eq("unit_id", unit.id)
      .eq("user_id", userId);
    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: "removed" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "internal-error" },
      { status: 500 }
    );
  }
}
