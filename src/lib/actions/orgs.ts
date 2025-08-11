"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/** LIST */
export async function listMyOrgs(): Promise<Result<Org[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const { data, error } = await supabase
    .from("orgs")
    .select("id, name, slug")
    .order("name");

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as Org[] };
}

/** GET por slug ou id (compatível com URL antiga) */
export async function getOrg(slugOrId: string): Promise<Result<Org>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
      error: error?.message || "Organização não encontrada.",
    };
  return { ok: true, data: data[0] as Org };
}

/** CREATE (já com slug único) */
export async function createOrg(name: string): Promise<Result<Org>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const trimmed = (name || "").trim();
  if (!trimmed) return { ok: false, error: "Nome inválido." };

  const base = slugify(trimmed);

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
}

/** UPDATE (renomear + recalcular slug único) */
export async function updateOrg(
  orgId: string,
  newName: string
): Promise<Result<Org>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

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
}

/** DELETE */
export async function deleteOrg(orgId: string): Promise<Result<null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuário não autenticado." };

  const { error } = await supabase.from("orgs").delete().eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orgs");
  return { ok: true, data: null };
}
