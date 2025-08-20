"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PlatformRole, OrgRole, UnitRole, AppRole } from "@/lib/types/roles";
import { PLATFORM_ROLES, ORG_ROLES, UNIT_ROLES, APP_ROLES, ORG_ADMIN, UNIT_USER } from "@/lib/types/roles";

const PLATFORM_ADMIN: PlatformRole = "platform_admin";
const DEFAULT_ORG_ROLE: OrgRole = ORG_ADMIN;
const DEFAULT_UNIT_ROLE: UnitRole = UNIT_USER;

/** Tipos */
export type Unit = {
  id: string;
  name: string;
  slug: string;
  org_id: string;
  address?: string | null;
  cnpj?: string | null;
  phone?: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Utils */
function slugify(txt: string) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getSessionUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return false;

  const { data } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", uid)
    .maybeSingle();

  return data?.global_role === PLATFORM_ADMIN;
}

/** Retorna { org_id, role } do usuário logado em org_members */
async function getMyOrgMembership() {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid)
    .maybeSingle();

  return data as { org_id: string; role: OrgRole } | null;
}

/** Quem pode gerenciar unidades da org? platform_admin OU org_admin da org */
async function assertCanManageUnits(targetOrgId: string) {
  const [platform, me] = await Promise.all([
    isPlatformAdmin(),
    getMyOrgMembership(),
  ]);
  if (platform) return;
  if (!me || me.org_id !== targetOrgId || me.role !== DEFAULT_ORG_ROLE) {
    throw new Error(
      "Acesso negado: você não pode gerenciar unidades desta organização."
    );
  }
}

/* ===================== QUERIES ===================== */

/** Lista unidades de uma organização (RLS restringe o acesso) */
export async function listUnits(orgId: string): Promise<Result<Unit[]>> {
  try {
    const supabase = createClient();
    const uid = await getSessionUserId();
    if (!uid) return { ok: false, error: "Usuário não autenticado." };

    const { data, error } = await supabase
      .from("units")
      .select("id, name, slug, org_id, address, cnpj, phone")
      .eq("org_id", orgId)
      .order("name");

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as Unit[] };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao listar unidades." };
  }
}

/** Retorna unidade pelo slug e org_id, validando pertencimento via org_members */
export async function getUnitBySlug(
  orgId: string,
  slug: string
): Promise<Result<Unit>> {
  try {
    const supabase = createClient();

    // 1) auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    // 2) valida se usuário pertence à organização (org_members)
    // (Policy de SELECT em org_members permite ler a PRÓPRIA linha)
    const { data: membership, error: mErr } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Se não for membro e não for platform_admin => acesso negado
    if (!membership) {
      const platform = await isPlatformAdmin();
      if (!platform) {
        return { ok: false, error: "Acesso negado à organização." };
      }
    }

    // 3) busca unidade
    const { data, error } = await supabase
      .from("units")
      .select("id, name, slug, org_id, address, cnpj, phone")
      .eq("org_id", orgId)
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message || "Unidade não encontrada." };
    }

    return { ok: true, data: data as Unit };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao carregar unidade." };
  }
}

/* ===================== MUTATIONS ===================== */

/** Cria uma unidade (platform_admin ou org_admin) — cria slug único por org */
export async function createUnit(
  orgId: string,
  name: string,
  opts?: { revalidate?: string }
): Promise<Result<Unit>> {
  try {
    await assertCanManageUnits(orgId);

    const supabase = createClient();
    const trimmed = (name || "").trim();
    if (!trimmed) return { ok: false, error: "Nome inválido." };

    const base = slugify(trimmed);

    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data, error } = await supabase
        .from("units")
        .insert({ org_id: orgId, name: trimmed, slug: candidate })
        .select("id, name, slug, org_id, address, cnpj, phone")
        .single();

      if (!error && data) {
        if (opts?.revalidate) revalidatePath(opts.revalidate);
        return { ok: true, data: data as Unit };
      }
      // 23505 = unique violation (slug duplicado dentro da org)
      if (error && (error as any).code !== "23505") {
        return { ok: false, error: error.message };
      }
    }
    return { ok: false, error: "Já existe uma unidade com esse nome." };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao criar unidade." };
  }
}

/** Atualiza nome/slug da unidade (platform_admin ou org_admin da org da unidade) */
export async function updateUnit(
  unitId: string,
  newName: string,
  opts?: { revalidate?: string }
): Promise<Result<Unit>> {
  try {
    const supabase = createClient();

    // pega org da unidade
    const { data: current, error: readErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .single();

    if (readErr || !current) {
      return {
        ok: false,
        error: readErr?.message || "Unidade não encontrada.",
      };
    }

    await assertCanManageUnits(current.org_id);

    const trimmed = (newName || "").trim();
    if (!trimmed) return { ok: false, error: "Nome inválido." };

    const base = slugify(trimmed);

    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data, error } = await supabase
        .from("units")
        .update({ name: trimmed, slug: candidate })
        .eq("id", unitId)
        .select("id, name, slug, org_id, address, cnpj, phone")
        .single();

      if (!error && data) {
        if (opts?.revalidate) revalidatePath(opts.revalidate);
        return { ok: true, data: data as Unit };
      }
      if (error && (error as any).code !== "23505") {
        return { ok: false, error: error.message };
      }
    }

    return { ok: false, error: "Já existe uma unidade com esse nome." };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao atualizar unidade." };
  }
}

/** Atualiza detalhes da unidade (endereço, CNPJ, telefone) */
export async function updateUnitDetails(
  unitId: string,
  payload: Partial<Pick<Unit, "name" | "address" | "cnpj" | "phone">>,
  opts?: { revalidate?: string }
): Promise<Result<Unit>> {
  try {
    const supabase = createClient();

    // pega org da unidade
    const { data: current, error: readErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .single();

    if (readErr || !current) {
      return {
        ok: false,
        error: readErr?.message || "Unidade não encontrada.",
      };
    }

    await assertCanManageUnits(current.org_id);

    // Evita update vazio/crash
    const toUpdate: Record<string, any> = {};
    for (const k of ["name", "address", "cnpj", "phone"] as const) {
      if (k in payload) (toUpdate as any)[k] = (payload as any)[k];
    }

    const { data, error } = await supabase
      .from("units")
      .update(toUpdate)
      .eq("id", unitId)
      .select("id, name, slug, org_id, address, cnpj, phone")
      .single();

    if (error) return { ok: false, error: error.message };

    if (opts?.revalidate) revalidatePath(opts.revalidate);
    return { ok: true, data: data as Unit };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao atualizar detalhes da unidade." };
  }
}

/** Exclui unidade (platform_admin ou org_admin da org da unidade) */
export async function deleteUnit(
  unitId: string,
  opts?: { revalidate?: string }
): Promise<Result<null>> {
  try {
    const supabase = createClient();

    // pega org da unidade
    const { data: current, error: readErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .single();

    if (readErr || !current) {
      return {
        ok: false,
        error: readErr?.message || "Unidade não encontrada.",
      };
    }

    await assertCanManageUnits(current.org_id);

    const { error } = await supabase.from("units").delete().eq("id", unitId);
    if (error) return { ok: false, error: error.message };

    if (opts?.revalidate) revalidatePath(opts.revalidate);
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao excluir unidade." };
  }
}
