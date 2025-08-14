// src/lib/actions/orgs.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type Org = { id: string; name: string; slug: string };

/** slugify local (igual ao que usamos no banco) */
function slugify(txt: string) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Helpers de permissão */
async function getSessionUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

async function isPlatformAdmin() {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();

  if (error) return false;
  return data?.global_role === "platform_admin";
}

async function isOrgAdmin(orgId: string) {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .limit(1);

  if (error) return false;
  return (data?.[0]?.role ?? "") === "org_admin";
}

/** LIST (minhas orgs pela RLS) */
export async function listMyOrgs(): Promise<Result<Org[]>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const { data, error } = await supabase
      .from("orgs")
      .select("id, name, slug")
      .order("name");

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as Org[] };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao listar organizações." };
  }
}

/** LIST (todas as orgs — apenas platform_admin) */
export async function listAllOrgsForAdmin(): Promise<Result<Org[]>> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const admin = await isPlatformAdmin();
    if (!admin) {
      // fallback: se não for admin de plataforma, retorna somente as orgs visíveis pela RLS
      return await listMyOrgs();
    }

    const svc = createServiceClient(); // ignora RLS após checar permissão
    const { data, error } = await svc
      .from("orgs")
      .select("id, name, slug")
      .order("name");

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as Org[] };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message ?? "Falha ao listar organizações (admin).",
    };
  }
}

/** GET por slug ou id (RLS garante acesso) */
export async function getOrg(slugOrId: string): Promise<Result<Org>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId
      );

    const q = supabase.from("orgs").select("id, name, slug").limit(1);
    const { data, error } = isUuid
      ? await q.eq("id", slugOrId)
      : await q.eq("slug", slugOrId);

    if (error || !data?.[0])
      return {
        ok: false,
        error: error?.message || "Organização não encontrada ou sem acesso.",
      };
    return { ok: true, data: data[0] as Org };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao carregar organização." };
  }
}

/** CREATE (apenas platform_admin; slug único) */
export async function createOrg(name: string): Promise<Result<Org>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const platform = await isPlatformAdmin();
    if (!platform) return { ok: false, error: "Acesso negado." };

    const trimmed = (name || "").trim();
    if (!trimmed) return { ok: false, error: "Nome inválido." };

    const base = slugify(trimmed);

    // tenta até 5 variações de slug (base, base-2, base-3...)
    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data, error } = await supabase
        .from("orgs")
        .insert({ name: trimmed, slug: candidate })
        .select("id, name, slug")
        .single();

      if (!error && data) {
        revalidatePath("/orgs");
        return { ok: true, data: data as Org };
      }
      if (error && (error as any).code !== "23505") {
        return { ok: false, error: error.message };
      }
    }
    return { ok: false, error: "Já existe uma organização com esse nome." };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao criar Organização." };
  }
}

/** UPDATE (renomear + slug único) — platform_admin OU org_admin daquela org */
export async function updateOrg(
  orgId: string,
  newName: string
): Promise<Result<Org>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const platform = await isPlatformAdmin();
    const orgAdmin = platform ? true : await isOrgAdmin(orgId);
    if (!orgAdmin) return { ok: false, error: "Acesso negado." };

    const trimmed = (newName || "").trim();
    if (!trimmed) return { ok: false, error: "Nome inválido." };

    const base = slugify(trimmed);

    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data, error } = await supabase
        .from("orgs")
        .update({ name: trimmed, slug: candidate })
        .eq("id", orgId)
        .select("id, name, slug")
        .single();

      if (!error && data) {
        revalidatePath("/orgs");
        return { ok: true, data: data as Org };
      }
      if (error && (error as any).code !== "23505") {
        return { ok: false, error: error.message };
      }
    }
    return { ok: false, error: "Já existe uma organização com esse nome." };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao atualizar Organização." };
  }
}

/** DELETE — por segurança, somente platform_admin */
export async function deleteOrg(orgId: string): Promise<Result<null>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const platform = await isPlatformAdmin();
    if (!platform) return { ok: false, error: "Acesso negado." };

    const { error } = await supabase.from("orgs").delete().eq("id", orgId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/orgs");
    return { ok: true, data: null };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao excluir Organização." };
  }
}
