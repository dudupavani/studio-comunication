"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Tipos */
export type Unit = {
  id: string;
  name: string;
  slug: string;
  org_id: string;
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

  return data?.global_role === "platform_admin";
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

  return data as { org_id: string; role: string } | null;
}

/** Quem pode gerenciar unidades da org? platform_admin OU org_admin da org */
async function assertCanManageUnits(targetOrgId: string) {
  const [platform, me] = await Promise.all([
    isPlatformAdmin(),
    getMyOrgMembership(),
  ]);
  if (platform) return;
  if (!me || me.org_id !== targetOrgId || me.role !== "org_admin") {
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
      .select("id, name, slug, org_id")
      .eq("org_id", orgId)
      .order("name");

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as Unit[] };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao listar unidades." };
  }
}

/** Retorna unidade pelo slug e org_id, validando se o usuário pertence à organização */
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

    // 2) valida org do usuário
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { ok: false, error: "Perfil do usuário não encontrado." };
    }
    if (profile.org_id !== orgId) {
      return { ok: false, error: "Acesso negado à organização." };
    }

    // 3) busca unidade
    const { data, error } = await supabase
      .from("units")
      .select("id, name, slug, org_id")
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
        .select("id, name, slug, org_id")
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
        .select("id, name, slug, org_id")
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
