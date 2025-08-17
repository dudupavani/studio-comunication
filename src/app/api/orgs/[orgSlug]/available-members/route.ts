// src/app/api/orgs/[orgSlug]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await ctx.params;
    
    // Precisamos obter o ID da organização a partir do slug
    const supabase = createServiceClient();
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .select("id")
      .eq("slug", orgSlug)
      .single();
      
    if (orgError || !org) {
      return NextResponse.json(
        { ok: false, error: "Organização não encontrada" },
        { status: 404 }
      );
    }
    
    const orgId = org.id;

    const url = new URL(req.url);
    const unitId = url.searchParams.get("unitId");
    if (!unitId) {
      return NextResponse.json(
        { ok: false, error: "unitId obrigatório" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Busca todos os membros da unidade
    const { data: unitMembers, error: unitError } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("unit_id", unitId);

    if (unitError) {
      console.error(
        "[/api/orgs/.../available-members] unit_members ERROR:",
        unitError
      );
      return NextResponse.json(
        { ok: false, error: unitError.message },
        { status: 500 }
      );
    }

    const unitUserIds = (unitMembers || []).map((m: any) => m.user_id);

    // Busca todos os membros da organização
    const { data: orgMembers, error: orgError } = await supabase
      .from("org_members")
      .select("user_id, profiles(name, email)")
      .eq("org_id", orgId);

    if (orgError) {
      console.error(
        "[/api/orgs/.../available-members] org_members ERROR:",
        orgError
      );
      return NextResponse.json(
        { ok: false, error: orgError.message },
        { status: 500 }
      );
    }

    // Filtra os membros da org que não estão na unidade
    const users = (orgMembers || [])
      .filter((item: any) => !unitUserIds.includes(item.user_id))
      .map((item: any) => ({
        id: item.user_id,
        name: item.profiles?.name ?? null,
        email: item.profiles?.email ?? null,
      }));

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro inesperado" },
      { status: 500 }
    );
  }
}
