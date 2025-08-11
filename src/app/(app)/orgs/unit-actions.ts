// src/app/(app)/orgs/unit-actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteUnit } from "@/lib/actions/units";

export async function deleteUnitAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!orgId || !unitId) {
    return { ok: false, error: "Dados insuficientes." };
  }

  const res = await deleteUnit(orgId, unitId);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "Falha ao excluir unidade." };
  }

  // invalida listas
  revalidatePath("/orgs");
  // se veio destino, manda pra lá (página da organização)
  if (redirectTo) redirect(redirectTo);

  return { ok: true, data: null };
}
