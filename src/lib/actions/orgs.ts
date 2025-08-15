// src/lib/actions/orgs.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type Org = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
};

export type OrgDetails = {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;
};

export type OrgAdmin = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

function slugify(txt: string) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getSessionUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

/** Checa platform_admin de forma robusta */
async function isPlatformAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return false;

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "is_platform_admin"
    );
    if (!rpcErr && typeof rpcData === "boolean") return rpcData;

    const { data: p1, error: e1 } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!e1 && p1?.role === "platform_admin") return true;

    const { data: p2, error: e2 } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();
    if (!e2 && p2?.global_role === "platform_admin") return true;

    return false;
  } catch {
    return false;
  }
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

/** Helper: select de detalhes com fallback se colunas não existirem */
async function selectOrgDetailsSafe(
  client:
    | ReturnType<typeof createClient>
    | ReturnType<typeof createServiceClient>,
  isUuid: boolean,
  slugOrId: string
) {
  // 1) tenta com todos os campos
  const baseQuery = client
    .from("orgs")
    .select("id, name, slug, cnpj, address, phone, cep, city, state")
    .limit(1);

  const full = isUuid
    ? baseQuery.eq("id", slugOrId)
    : baseQuery.eq("slug", slugOrId);
  const { data: dataFull, error: errFull } = await full;

  // Se deu certo, retorna
  if (!errFull && dataFull && dataFull[0]) {
    return { data: dataFull[0] as OrgDetails, error: null as any };
  }

  // Se erro for "column ... does not exist" (42703), tenta fallback
  const message = String(errFull?.message || "");
  if (message.includes("column") && message.includes("does not exist")) {
    const q2 = client.from("orgs").select("id, name, slug, city").limit(1);
    const { data: dataLite, error: errLite } = isUuid
      ? await q2.eq("id", slugOrId)
      : await q2.eq("slug", slugOrId);

    if (!errLite && dataLite && dataLite[0]) {
      const row = dataLite[0] as any;
      // completa com null para os campos faltantes
      const details: OrgDetails = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        cnpj: null,
        address: null,
        phone: null,
        cep: null,
        city: row.city ?? null,
        state: null,
      };
      return { data: details, error: null as any };
    }
    // fallback também falhou
    return { data: null as any, error: errLite ?? errFull };
  }

  // outro erro qualquer
  return { data: null as any, error: errFull };
}

/** LIST (minhas orgs pela RLS) */
export async function listMyOrgs(): Promise<Result<Org[]>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const { data, error } = await supabase
      .from("orgs")
      .select("id, name, slug, city")
      .order("name");

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []) as Org[] };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao listar organizações." };
  }
}

/** LIST (todas — apenas platform_admin; usa service client) */
export async function listAllOrgsForAdmin(): Promise<Result<Org[]>> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const admin = await isPlatformAdmin();
    if (!admin) {
      return await listMyOrgs();
    }

    const svc = createServiceClient();
    const { data, error } = await svc
      .from("orgs")
      .select("id, name, slug, city")
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

/** GET completo com fallback seguro + service client quando platform_admin */
export async function getOrgWithDetails(
  slugOrId: string
): Promise<Result<OrgDetails>> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const admin = await isPlatformAdmin();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId
      );

    const client = admin ? createServiceClient() : createClient();

    const { data, error } = await selectOrgDetailsSafe(
      client,
      isUuid,
      slugOrId
    );

    if (error || !data) {
      console.error("getOrgWithDetails query failed:", {
        slugOrId,
        admin,
        error,
        data,
      });
      return {
        ok: false,
        error: error?.message || "Organização não encontrada ou sem acesso.",
      };
    }

    return { ok: true, data };
  } catch (e: any) {
    console.error("getOrgWithDetails exception:", e);
    return { ok: false, error: e.message ?? "Falha ao carregar organização." };
  }
}

/** GET curto com service client quando platform_admin */
export async function getOrg(slugOrId: string): Promise<Result<Org>> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const admin = await isPlatformAdmin();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slugOrId
      );

    const client = admin ? createServiceClient() : createClient();
    const q = client.from("orgs").select("id, name, slug, city").limit(1);

    const { data, error } = isUuid
      ? await q.eq("id", slugOrId)
      : await q.eq("slug", slugOrId);

    if (error || !data?.[0]) {
      console.error("getOrg query failed:", { slugOrId, admin, error, data });
      return {
        ok: false,
        error: error?.message || "Organização não encontrada ou sem acesso.",
      };
    }

    return { ok: true, data: data[0] as Org };
  } catch (e: any) {
    console.error("getOrg exception:", e);
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

    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;

      const { data, error } = await supabase
        .from("orgs")
        .insert({ name: trimmed, slug: candidate })
        .select("id, name, slug, cidade")
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

/** UPDATE rename (compat) */
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
        .select("id, name, slug, cidade")
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

/** UPDATE detalhes (dados cadastrais) */
export type OrgUpdatePayload = Partial<
  Pick<
    OrgDetails,
    "name" | "cnpj" | "address" | "phone" | "cep" | "city" | "state"
  >
>;

export async function updateOrgDetails(
  orgId: string,
  payload: OrgUpdatePayload
): Promise<Result<OrgDetails>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const platform = await isPlatformAdmin();
    const orgAdmin = platform ? true : await isOrgAdmin(orgId);
    if (!orgAdmin) return { ok: false, error: "Acesso negado." };

    // Evita update vazio/crash
    const toUpdate: Record<string, any> = {};
    for (const k of [
      "name",
      "cnpj",
      "address",
      "phone",
      "cep",
      "city",
      "state",
    ] as const) {
      if (k in payload) (toUpdate as any)[k] = (payload as any)[k];
    }

    const { data, error } = await supabase
      .from("orgs")
      .update(toUpdate)
      .eq("id", orgId)
      .select("id, name, slug, cnpj, address, phone, cep, city, state")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/orgs");
    revalidatePath(`/orgs/${data.slug}`);

    return { ok: true, data: data as OrgDetails };
  } catch (e: any) {
    return { ok: false, error: e.message ?? "Falha ao salvar dados da org." };
  }
}

/** DELETE — somente platform_admin */
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

/** RESPONSÁVEIS (org_admin) */
export async function getOrgAdmins(orgId: string): Promise<Result<OrgAdmin[]>> {
  try {
    const supabase = createClient();
    const user = await getSessionUser();
    if (!user) return { ok: false, error: "Usuário não autenticado." };

    const { data, error } = await supabase
      .from("org_members")
      .select(
        `
        role,
        profiles:profiles!inner (
          id,
          full_name,
          phone
        )
      `
      )
      .eq("org_id", orgId)
      .eq("role", "org_admin");

    if (error) return { ok: false, error: error.message };

    const admins: OrgAdmin[] =
      (data ?? []).map((row: any) => ({
        id: row.profiles?.id,
        full_name: row.profiles?.full_name ?? null,
        phone: row.profiles?.phone ?? null,
      })) ?? [];

    return { ok: true, data: admins };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message ?? "Falha ao carregar responsáveis da organização.",
    };
  }
}
