// src/app/api/units/[unitId]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { isOrgAdminFor, isUnitMasterFor } from "@/lib/permissions-org";
import { fetchEmailsByUserIds } from "@/lib/email-admin";

// type guard simples
function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

export async function GET(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/available-members">
) {
  try {
    const supabase = createServiceClient();

    // 1) Autenticação obrigatória
    const auth = await getAuthContext();
    if (!auth?.userId) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    // 2) Params
    const { unitId } = await context.params;
    if (!isUUID(unitId)) {
      return NextResponse.json(
        { ok: false, error: "unitId inválido" },
        { status: 400 }
      );
    }

    // 3) Derivar orgId real da unidade (server-side)
    const { data: unitRow, error: unitErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .single();

    if (unitErr) {
      return NextResponse.json(
        { ok: false, error: unitErr.message },
        { status: 500 }
      );
    }
    if (!unitRow?.org_id) {
      return NextResponse.json(
        { ok: false, error: "Unidade não encontrada" },
        { status: 404 }
      );
    }
    const orgIdFromUnit = unitRow.org_id as string;

    // 4) Query param org_id (compat) — precisa bater com a unidade
    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("org_id");
    if (!isUUID(orgIdParam)) {
      return NextResponse.json(
        { ok: false, error: "org_id é obrigatório" },
        { status: 400 }
      );
    }
    if (orgIdParam !== orgIdFromUnit) {
      return NextResponse.json(
        { ok: false, error: "org_id inválido para a unidade informada" },
        { status: 403 }
      );
    }

    // 5) Gate de permissão (admin de plataforma, admin da org, ou master da unidade)
    const isPlatformAdmin = auth.platformRole === "platform_admin";
    const isOrgAdmin = await isOrgAdminFor(orgIdFromUnit, auth.userId);
    const isUnitMaster = await (async () => {
      try {
        return await isUnitMasterFor(orgIdFromUnit, unitId, auth.userId);
      } catch {
        return false;
      }
    })();

    if (!(isPlatformAdmin || isOrgAdmin || isUnitMaster)) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    // 6) Usuários já vinculados na unidade
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

    // 7) Membros da organização (com nome em profiles)
    const { data: orgUsers, error: orgErr } = await supabase
      .from("org_members")
      .select("user_id, profiles!inner(full_name, avatar_url)")
      .eq("org_id", orgIdFromUnit);

    if (orgErr) {
      return NextResponse.json(
        { ok: false, error: orgErr.message },
        { status: 500 }
      );
    }

    // 8) Candidatos: pertencem à org e NÃO estão na unidade
    const baseUsers =
      (orgUsers ?? [])
        .map((r: any) => ({
          id: r.user_id as string,
          name: (r.profiles?.full_name as string | null) ?? null,
          email: null as string | null, // preenchido abaixo
          avatarUrl:
            (r.profiles?.avatar_url as string | null | undefined) ?? null,
        }))
        .filter((u) => !alreadyIds.has(u.id)) ?? [];

    if (baseUsers.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    // 9) Enriquecer com e-mails (auth.users via Admin API)
    const emailMap = await fetchEmailsByUserIds(
      supabase,
      baseUsers.map((u) => u.id)
    );

    const users = baseUsers
      .map((u) => ({
        ...u,
        email: emailMap.get(u.id) ?? null,
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
