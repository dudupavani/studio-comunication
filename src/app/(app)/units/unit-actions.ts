// src/app/(app)/units/unit-actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { createUnit, deleteUnit, updateUnitDetails } from "@/lib/actions/units";

export async function createUnitAction(orgId: string, name: string) {
  const auth = await getAuthContext();
  if (!auth?.userId) redirect("/login");
  // (Opcional) hardening: validar orgId === auth.orgId
  const res = await createUnit(orgId, name);
  // Revalidate sempre a lista slugless
  revalidatePath("/units");
  // Se criou com sucesso e tem slug, ir direto para o detalhe slugless
  if (res?.ok && res.data?.slug) {
    redirect(`/units/${res.data.slug}`);
  }
  return res;
}

export async function deleteUnitAction(unitId: string) {
  const auth = await getAuthContext();
  if (!auth?.userId) redirect("/login");
  const res = await deleteUnit(unitId);
  // Após excluir, volta para a lista slugless
  revalidatePath("/units");
  return res;
}

type FormState = { ok?: boolean; error?: string };

export async function updateUnitDetailsAction(
  _prevState: FormState,
  formData: FormData
) {
  const auth = await getAuthContext();
  if (!auth?.userId) redirect("/login");

  const orgId = formData.get("orgId") as string;
  const unitId = formData.get("unitId") as string;
  const name = formData.get("name") as string;
  const address = (formData.get("address") as string) || null;
  const cnpj = (formData.get("cnpj") as string) || null;
  const phone = (formData.get("phone") as string) || null;

  // Validação básica
  if (!orgId || !unitId || !name) {
    return { ok: false, error: "Dados inválidos" };
  }

  // Atualiza os detalhes da unidade
  const res = await updateUnitDetails(unitId, { name, address, cnpj, phone });

  // Revalida a página da unidade
  if (res.ok && res.data?.slug) {
    revalidatePath("/units");
    revalidatePath(`/units/${res.data.slug}`);
    return redirect(`/units/${res.data.slug}`);
  }

  return res;
}

/**
 * Wrapper para ConfirmDialog: recebe FormData,
 * extrai unitId e delega para deleteUnitAction(unitId).
 * Assinatura compatível com (formData: FormData) => Promise<void>.
 */
export async function deleteUnitFormAction(formData: FormData): Promise<void> {
  "use server";

  const unitId = String(formData.get("unitId") ?? "").trim();
  if (!unitId) {
    throw new Error("unitId obrigatório");
  }

  const res = await deleteUnitAction(unitId);
  if (!res?.ok) {
    throw new Error(res?.error ?? "Erro ao excluir unidade");
  }
}
