// src/app/(app)/units/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
// ✅ Renomeamos a importação para evitar conflito de nome com o wrapper local
import { createUnitAction as createUnit } from "@/app/(app)/units/unit-actions";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import UnitsTable from "@/components/units/units-table";
import { isOrgAdminFor } from "@/lib/permissions-org";

export default async function UnitsPage() {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units auth:", {
      userId: auth?.userId,
      platformRole: auth?.platformRole,
      orgId: auth?.orgId,
      orgRole: auth?.orgRole,
    });
  }
  if (!auth) redirect("/login");

  // No modo single-org, usamos o orgId do contexto de autenticação
  const orgId = auth?.orgId;
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units orgId from auth:", orgId);
  }
  if (!orgId) redirect("/dashboard");

  const orgRes = await getOrgWithDetails(orgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  const canAdmin =
    auth.platformRole === "platform_admin" ||
    (await isOrgAdminFor(fullOrg.id, auth.userId));
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units guards:", { canAdmin });
  }
  if (!canAdmin) redirect("/dashboard");

  const unitsRes = await listUnits(fullOrg.id);
  const units = unitsRes.ok ? unitsRes.data ?? [] : [];

  // ✅ Wrapper com a assinatura que o AddUnitModal espera: (formData) => Promise<void>
  //    Ele extrai "name" do form, usa orgId do contexto e chama sua action original (orgId, name).
  async function createUnitFormAction(formData: FormData): Promise<void> {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Nome da unidade é obrigatório.");
    }

    const res = await createUnit(fullOrg.id, name);
    if (!res?.ok) {
      throw new Error(res?.error ?? "Erro ao criar unidade");
    }

    // Se a sua createUnit já faz revalidatePath, não precisa repetir aqui.
    // Caso contrário, podemos revalidar aqui futuramente.
  }

  // Removido o redirecionamento automático para a primeira unidade
  // Agora a página sempre mostra a lista de unidades

  return (
    <div className="p-6">
      <section className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">
          Unidades{" "}
          <span className="font-light text-gray-500">({units.length})</span>
        </h1>
        <AddUnitModal
          orgId={fullOrg.id}
          slug={fullOrg.slug}
          action={createUnitFormAction} // ✅ assinatura correta
        />
      </section>

      <UnitsTable units={units} orgSlug={fullOrg.slug} orgId={fullOrg.id} />
    </div>
  );
}
