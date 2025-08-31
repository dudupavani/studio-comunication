// src/app/api/units/[unitId]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function isUUID(v: string | null | undefined) {
  return !!v && /^[0-9a-fA-F-]{36}$/.test(v);
}

export async function GET(req: Request, ctx: { params: { unitId?: string } }) {
  try {
    const supabase = createServiceClient();

    // params
    const unitId = ctx?.params?.unitId ?? null;
    if (!isUUID(unitId)) {
      return NextResponse.json(
        { ok: false, error: "unitId inválido" },
        { status: 400 }
      );
    }

    // query
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    if (!isUUID(orgId)) {
      return NextResponse.json(
        { ok: false, error: "org_id é obrigatório" },
        { status: 400 }
      );
    }

    // usuários já vinculados na unidade
    const { data: existingRows, error: existingErr } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("unit_id", unitId);

    if (existingErr) {
      return NextResponse.json(
        { ok: false, error: existingErr.message },
        { status: 500 }
      );
    }

    const alreadyIds = new Set(
      (existingRows ?? []).map((r) => r.user_id as string)
    );

    // membros da organização (com nome em profiles)
    const { data: orgUsers, error: orgErr } = await supabase
      .from("org_members")
      .select("user_id, profiles!inner(full_name)")
      .eq("org_id", orgId);

    if (orgErr) {
      return NextResponse.json(
        { ok: false, error: orgErr.message },
        { status: 500 }
      );
    }

    // filtra quem já está na unidade
    const users =
      (orgUsers ?? [])
        .map((r: any) => ({
          id: r.user_id as string,
          name: (r.profiles?.full_name as string | null) ?? null,
          email: null as string | null, // profiles não tem email
        }))
        .filter((u) => !alreadyIds.has(u.id)) ?? [];

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
