// src/lib/actions/units.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Ajuste para o seu tipo global se já existir
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type UnitRow = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  address?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
};

// util slug simples (troque pelo seu oficial se tiver)
function toSlug(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

/** Gera slug único dentro da organização. */
async function uniqueUnitSlug(
  orgId: string,
  baseName: string
): Promise<string> {
  const supabase = await createClient();
  const base = toSlug(baseName) || "unidade";

  const { data, error } = await supabase
    .from("units")
    .select("slug")
    .eq("org_id", orgId)
    .like("slug", `${base}%`);

  if (error || !data?.length) return base;

  // encontra próximo sufixo livre
  let i = 1;
  const has = new Set(data.map((d) => d.slug));
  let candidate = base;
  while (has.has(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

/** Lista unidades da org (para a página da organização). */
export async function listUnits(
  orgId: string
): Promise<ActionResult<UnitRow[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, org_id, name, slug, address, cnpj, phone")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as UnitRow[] };
}

/** Cria uma unidade na org (nome obrigatório). */
export async function createUnit(
  orgId: string,
  name: string
): Promise<ActionResult<UnitRow>> {
  const supabase = await createClient();

  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "Nome da unidade é obrigatório." };

  const slug = await uniqueUnitSlug(orgId, trimmed);

  const { data, error } = await supabase
    .from("units")
    .insert({ org_id: orgId, name: trimmed, slug })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/orgs");
  return { ok: true, data: data as UnitRow };
}

/** Busca unidade por slug (garantindo org). */
export async function getUnitBySlug(
  orgId: string,
  unitSlug: string
): Promise<ActionResult<UnitRow>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("org_id", orgId)
    .eq("slug", unitSlug)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as UnitRow };
}

/** Atualiza campos da unidade; se nome mudar, recalcula slug. */
export async function updateUnit(
  orgId: string,
  unitId: string,
  patch: {
    name?: string;
    address?: string;
    cnpj?: string;
    phone?: string;
  }
): Promise<ActionResult<UnitRow>> {
  const supabase = await createClient();

  const name = patch.name !== undefined ? String(patch.name ?? "") : undefined;
  const address =
    patch.address !== undefined ? String(patch.address ?? "") : undefined;
  const cnpj = patch.cnpj !== undefined ? String(patch.cnpj ?? "") : undefined;
  const phone =
    patch.phone !== undefined ? String(patch.phone ?? "") : undefined;

  const updateData: Partial<UnitRow> = {
    ...(name !== undefined ? { name } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(cnpj !== undefined ? { cnpj } : {}),
    ...(phone !== undefined ? { phone } : {}),
  };

  if (name !== undefined) {
    const next = toSlug(name) || "unidade";
    // garante unicidade no org
    updateData.slug = await uniqueUnitSlug(orgId, next);
  }

  const { data, error } = await supabase
    .from("units")
    .update(updateData)
    .eq("id", unitId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/orgs");
  return { ok: true, data: data as UnitRow };
}

/** Exclui unidade. */
export async function deleteUnit(
  orgId: string,
  unitId: string
): Promise<ActionResult<null>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("org_id", orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/orgs");
  return { ok: true, data: null };
}
