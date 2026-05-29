// src/app/api/units/[unitId]/members/[userId]/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";

// Type guard para estreitar para string
function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

/**
 * DELETE /api/units/:unitId/members/:userId?org_id=...
 * Remove (desvincula) um usuário de uma unidade.
 *
 * Mantém o padrão já usado (org_id por querystring).
 * Não altera outros endpoints.
 */
export async function DELETE(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/members/[userId]">
) {
  try {
    const auth = await getAuthContext();
    if (!auth?.userId) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Params
    const { unitId, userId } = await context.params;
    if (!isUUID(unitId) || !isUUID(userId)) {
      return NextResponse.json(
        { ok: false, error: "unitId ou userId inválido" },
        { status: 400 }
      );
    }

    // Query: org_id (seguindo padrão vigente)
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    if (!isUUID(orgId)) {
      return NextResponse.json(
        { ok: false, error: "org_id é obrigatório" },
        { status: 400 }
      );
    }

    // (Recomendado) Confirmar que a unit pertence à org informada
    const { data: unitRow, error: unitErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .single();

    if (unitErr) {
      return NextResponse.json({ ok: false, error: "Erro ao verificar unidade." }, { status: 500 });
    }
    if (!unitRow) {
      return NextResponse.json({ ok: false, error: "Unidade não encontrada." }, { status: 404 });
    }

    // Tenant scope: usa auth.orgId como fonte confiável, não o query param
    if (auth.platformRole !== "platform_admin" && auth.orgId !== unitRow.org_id) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    // Role check
    const canManage =
      auth.platformRole === "platform_admin" ||
      auth.orgRole === "org_admin" ||
      auth.orgRole === "org_master" ||
      (auth.orgRole === "unit_master" && auth.unitIds.includes(unitId));
    if (!canManage) {
      return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
    }

    // Verificar existência do vínculo
    const { data: linkRow, error: linkErr } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("unit_id", unitId)
      .eq("user_id", userId)
      .maybeSingle();

    if (linkErr) {
      return NextResponse.json({ ok: false, error: "Erro ao verificar vínculo." }, { status: 500 });
    }

    if (!linkRow) {
      // idempotente: nada para remover
      return NextResponse.json({ ok: true, removed: 0 });
    }

    // Remover vínculo
    const { error: delErr } = await supabase
      .from("unit_members")
      .delete()
      .eq("org_id", orgId)
      .eq("unit_id", unitId)
      .eq("user_id", userId);

    if (delErr) {
      return NextResponse.json({ ok: false, error: "Erro ao remover membro." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, removed: 1 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Erro inesperado." }, { status: 500 });
  }
}
