// src/lib/actions/unit-members.ts
"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { UnitRole } from "@/lib/types/roles";

// ============================
// Tipos públicos
// ============================

export type UnitMember = {
  user_id: string;
  // ⚠️ Em seu schema atual, unit_members NÃO tem 'role'.
  // Mantemos o campo por compatibilidade de tipos, preenchendo como null.
  role: UnitRole | null;
  // ⚠️ Em seu schema atual, profiles NÃO tem 'email'.
  // Mantemos o campo por compatibilidade de tipos, preenchendo como null.
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
};

export type UnitMemberWithEmail = UnitMember & {
  // Campo redundante para facilitar consumo direto na UI (opcional),
  // mantendo compatibilidade com o shape atual.
  email: string | null;
  org_role?: string | null;
  cargo?: string | null;
};

// ============================
// Helper: buscar e-mails via Admin API (em lotes)
// ============================

/**
 * Busca e-mails no auth.users usando a Admin API do Supabase, em lotes.
 * - Executa APENAS no servidor (usa service role).
 * - Não lança erro no conjunto inteiro se um usuário falhar: preenche null.
 */
async function fetchEmailsByUserIds(
  userIds: string[]
): Promise<Map<string, string | null>> {
  const supabase = createServiceClient();
  const emailById = new Map<string, string | null>();
  const ids = Array.from(new Set(userIds)); // unique
  const chunkSize = 25;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const res = await supabase.auth.admin.getUserById(id);
          const email = res?.data?.user?.email ?? null;
          emailById.set(id, email);
        } catch {
          emailById.set(id, null);
        }
      })
    );
  }

  return emailById;
}

// ============================
// Listar membros da unidade (BASE, sem e-mail)
// ============================

export async function listUnitMembers(orgId: string, unitId: string) {
  const supabase = createServiceClient();

  // ⚠️ Importante:
  // - NÃO selecionar profiles.email (não existe na sua tabela profiles)
  // - NÃO selecionar unit_members.role (sua tabela unit_members não tem essa coluna)
  const { data, error } = await supabase
    .from("unit_members")
    .select(
      `
      user_id,
      profiles:profiles!inner (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .order("user_id", { ascending: true }); // ordem estável

  if (error) {
    return { ok: false as const, error: error.message };
  }

  // Achatar o shape para compatibilidade com a UI (role/email = null)
  const mapped =
    (data ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      role: null as UnitRole | null,
      profiles: {
        full_name: (r.profiles?.full_name as string | null) ?? null,
        email: null as string | null,
        avatar_url: (r.profiles?.avatar_url as string | null) ?? null,
      },
    })) ?? [];

  return { ok: true as const, data: mapped as UnitMember[] };
}

// ============================
// Listar membros da unidade (ENRIQUECIDO com e-mail)
// ============================

/**
 * Variante segura que reaproveita a base (listUnitMembers) e agrega e-mail do auth.users
 * via Admin API. Não altera DB nem policies.
 */
export async function listUnitMembersWithEmail(orgId: string, unitId: string) {
  const base = await listUnitMembers(orgId, unitId);
  if (!base.ok) return base; // repassa erro

  const rows = base.data ?? [];
  if (rows.length === 0) {
    return { ok: true as const, data: [] as UnitMemberWithEmail[] };
  }

  const ids = rows.map((r) => r.user_id);
  const emailById = await fetchEmailsByUserIds(ids);

   // Buscar org_role e cargo via service client
  const svc = createServiceClient();
  const [rolesRes, cargoRes] = await Promise.all([
    svc
      .from("org_members")
      .select("user_id, role")
      .eq("org_id", orgId)
      .in("user_id", ids),
    svc
      .from("employee_profile")
      .select("user_id, cargo")
      .eq("org_id", orgId)
      .in("user_id", ids),
  ]);

  const roleMap = new Map<string, string | null>();
  (rolesRes.data ?? []).forEach((row: any) =>
    roleMap.set(row.user_id as string, row.role ?? null)
  );

  const cargoMap = new Map<string, string | null>();
  (cargoRes.data ?? []).forEach((row: any) =>
    cargoMap.set(row.user_id as string, row.cargo ?? null)
  );

  const enriched: UnitMemberWithEmail[] = rows.map((r) => ({
    ...r,
    email: emailById.get(r.user_id) ?? null,
    org_role: roleMap.get(r.user_id) ?? null,
    cargo: cargoMap.get(r.user_id) ?? null,
    // opcionalmente também poderíamos preencher profiles.email para simplificar consumo:
    profiles: r.profiles
      ? {
          ...r.profiles,
          email: emailById.get(r.user_id) ?? null,
          title: cargoMap.get(r.user_id) ?? null,
        }
      : {
          full_name: null,
          email: emailById.get(r.user_id) ?? null,
          avatar_url: null,
          title: cargoMap.get(r.user_id) ?? null,
        },
  }));

  return { ok: true as const, data: enriched };
}

// ============================
// Adicionar membro à unidade
// ============================

type AddUnitMemberResult =
  | { ok: true; data: UnitMember }
  | { ok: false; error: string };

export async function addUnitMember(params: {
  orgId: string;
  unitId: string;
  unitSlug: string;
  userId: string;
  // Mantemos o parâmetro 'role' por compatibilidade de chamadas,
  // mas ele será ignorado no INSERT (não existe no schema atual).
  role: UnitRole;
}): Promise<AddUnitMemberResult> {
  const supabase = createServiceClient();

  // 1) Verifica se usuário pertence à organização
  const { data: orgMember, error: orgErr } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", params.orgId)
    .eq("user_id", params.userId)
    .single();

  if (orgErr) {
    return { ok: false, error: orgErr.message };
  }

  if (!orgMember) {
    return {
      ok: false,
      error: "Usuário não pertence a esta organização",
    };
  }

  // 2) Verifica se já está vinculado à unidade
  const { data: existing, error: existErr } = await supabase
    .from("unit_members")
    .select("*")
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existErr) {
    return { ok: false, error: existErr.message };
  }

  if (existing) {
    return {
      ok: false,
      error: "Usuário já vinculado a esta unidade",
    };
  }

  // 3) Insere vínculo (SEM 'role', pois a tabela não possui essa coluna)
  const { data, error } = await supabase
    .from("unit_members")
    .insert({
      org_id: params.orgId,
      unit_id: params.unitId,
      user_id: params.userId,
    })
    .select(
      `
      user_id,
      profiles:profiles!inner (
        id,
        full_name
      )
    `
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // 4) Revalida as páginas que podem mostrar membros da unidade
  revalidatePath(`/units/${params.unitSlug}`);
  revalidatePath(`/units/${params.unitSlug}/members`);

  // 5) Monta o retorno compatível (role/email = null)
  const payload: UnitMember = {
    user_id: data.user_id as string,
    role: null,
    profiles: {
      full_name: (data.profiles?.full_name as string | null) ?? null,
      email: null,
    },
  };

  return {
    ok: true,
    data: payload,
  };
}

// ============================
// Remover membro da unidade
// ============================

export async function removeUnitMember(params: {
  orgId: string;
  unitId: string;
  unitSlug: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();

  // 1) Verifica se usuário está vinculado à unidade
  const { data: existing, error: existErr } = await supabase
    .from("unit_members")
    .select("*")
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existErr) {
    return { ok: false, error: existErr.message };
  }

  if (!existing) {
    return {
      ok: false,
      error: "Usuário não está vinculado a esta unidade",
    };
  }

  // 2) Remove vínculo
  const { error } = await supabase
    .from("unit_members")
    .delete()
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  // 3) Revalida as páginas relacionadas
  revalidatePath(`/units/${params.unitSlug}`);
  revalidatePath(`/units/${params.unitSlug}/members`);

  return { ok: true };
}
