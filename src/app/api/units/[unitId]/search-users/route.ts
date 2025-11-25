// src/app/api/units/[unitId]/search-users/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { isOrgAdminFor, isUnitMasterFor } from "@/lib/permissions-org";
import { fetchEmailsByUserIds } from "@/lib/email-admin";

function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

export async function GET(req: Request, ctx: { params: { unitId?: string } }) {
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
    const unitId = ctx?.params?.unitId;
    if (!isUUID(unitId)) {
      return NextResponse.json(
        { ok: false, error: "unitId inválido" },
        { status: 400 }
      );
    }

    // 3) Query params
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const orgIdParam = searchParams.get("org_id"); // compat (opcional)

    // Anti-enumeração básica — a UI já usa available-members quando sem query
    if (q.length < 2) {
      return NextResponse.json({ ok: true, users: [] });
    }

    // 4) Derivar orgId real da unidade (server-side)
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

    // 5) (Compat) se org_id vier na query, precisa bater com a unidade
    if (orgIdParam && (!isUUID(orgIdParam) || orgIdParam !== orgIdFromUnit)) {
      return NextResponse.json(
        { ok: false, error: "org_id inválido para a unidade informada" },
        { status: 403 }
      );
    }

    // 6) Gate de permissão
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

    // 7) Usuários já vinculados na unidade (para excluir da busca)
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
    const exclude = new Set(
      (existingRows ?? []).map((r) => r.user_id as string)
    );

    // 8) Candidatos: membros da org (com nome em profiles)
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

    const candidates =
      (orgUsers ?? [])
        .map((r: any) => ({
          id: r.user_id as string,
          name: (r.profiles?.full_name as string | null) ?? null,
          email: null as string | null, // preenchido após enriquecimento
          avatarUrl:
            (r.profiles?.avatar_url as string | null | undefined) ?? null,
        }))
        .filter((u) => !exclude.has(u.id)) ?? [];

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    // 9) Enriquecer e-mails via Admin API (APÓS permissão)
    const emailMap = await fetchEmailsByUserIds(
      supabase,
      candidates.map((u) => u.id)
    );

    const enriched = candidates.map((u) => ({
      ...u,
      email: emailMap.get(u.id) ?? null,
    }));

    // 10) Filtrar por 'q' em nome OU e-mail (case-insensitive)
    const qLower = q.toLowerCase();
    const filtered = enriched.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return name.includes(qLower) || email.includes(qLower);
    });

    // 11) Ordenar por nome e responder
    filtered.sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
    );

    return NextResponse.json({ ok: true, users: filtered });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
