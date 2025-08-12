"use server";

import { redirect } from "next/navigation";
import { createUnit, deleteUnit } from "@/lib/actions/units";

/**
 * Cria uma unidade e revalida a página da organização.
 * Espera: orgId, slug, name
 */
export async function createUnitAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!orgId || !slug || !name) {
    // volta para a página sem quebrar
    redirect(`/orgs/${slug}`);
  }

  const res = await createUnit(orgId, name, { revalidate: `/orgs/${slug}` });

  // independente de ok/erro, voltamos para a página (você pode colocar toast via client, se quiser)
  redirect(`/orgs/${slug}`);
}

/**
 * Exclui uma unidade e revalida a página da organização.
 * Espera: orgId, slug, unitId
 */
export async function deleteUnitAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const unitId = String(formData.get("unitId") ?? "");

  if (!orgId || !slug || !unitId) {
    redirect(`/orgs/${slug}`);
  }

  await deleteUnit(unitId, { revalidate: `/orgs/${slug}` });
  redirect(`/orgs/${slug}`);
}
