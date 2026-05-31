// src/app/api/orgs/[orgSlug]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveIdentityMap } from "@/lib/identity";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth?.userId) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    const { orgSlug } = await ctx.params;

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

    // Verificar que o usuário autenticado pertence à organização solicitada
    if (auth.platformRole !== "platform_admin" && auth.orgId !== orgId) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const unitId = url.searchParams.get("unitId");
    if (!unitId) {
      return NextResponse.json(
        { ok: false, error: "unitId obrigatório" },
        { status: 400 }
      );
    }

    // Confirmar que a unidade pertence à organização resolvida
    const { data: unitRow, error: unitOrgErr } = await supabase
      .from("units")
      .select("id")
      .eq("id", unitId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (unitOrgErr) {
      console.error("[/api/orgs/.../available-members] units ERROR:", unitOrgErr);
      return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
    }
    if (!unitRow) {
      return NextResponse.json({ ok: false, error: "Unidade não encontrada" }, { status: 404 });
    }

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
        { ok: false, error: "Erro ao buscar membros da unidade." },
        { status: 500 }
      );
    }

    const unitUserIds = (unitMembers || []).map((m: any) => m.user_id);

    // Busca todos os membros da organização
    const { data: orgMembers, error: orgMembersError } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (orgMembersError) {
      console.error(
        "[/api/orgs/.../available-members] org_members ERROR:",
        orgMembersError
      );
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar membros da organização." },
        { status: 500 }
      );
    }

    // Filtra os membros da org que não estão na unidade
    const candidateIds = (orgMembers || [])
      .map((item: any) => item.user_id as string)
      .filter((id) => !unitUserIds.includes(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    const identityMap = await resolveIdentityMap(candidateIds, {
      svc: supabase,
      orgId,
    });

    const users = candidateIds.map((id) => {
      const identity = identityMap.get(id);
      return {
        id,
        name: identity?.full_name ?? identity?.email ?? null,
        email: identity?.email ?? null,
      };
    });

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Erro inesperado." },
      { status: 500 }
    );
  }
}
