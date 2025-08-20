// src/app/(app)/unidades/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
import { createUnitAction } from "@/app/(app)/units/unit-actions";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import UnitsTable from "@/components/units/units-table";
import { isOrgAdminFor } from "@/lib/permissions-org";

export default async function UnidadesPage() {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /unidades enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /unidades auth:", {
      userId: auth?.userId, platformRole: auth?.platformRole, orgId: auth?.orgId, orgRole: auth?.orgRole
    });
  }
  if (!auth) redirect("/login");

  // No modo single-org, usamos o orgId do contexto de autenticação
  const orgId = auth?.orgId;
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /unidades orgId from auth:", orgId);
  }
  if (!orgId) redirect("/dashboard");

  const orgRes = await getOrgWithDetails(orgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  const canAdmin = auth.platformRole === "platform_admin" || await isOrgAdminFor(fullOrg.id, auth.userId);
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /unidades guards:", { canAdmin });
  }
  if (!canAdmin) redirect("/dashboard");

  const unitsRes = await listUnits(fullOrg.id);
  const units = unitsRes.ok ? (unitsRes.data ?? []) : [];

  return (
    <div className="space-y-6">
      <section className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-semibold">
          Unidades{" "}
          <span className="font-light text-gray-500">({units.length})</span>
        </h1>
        <AddUnitModal orgId={fullOrg.id} slug={fullOrg.slug} action={createUnitAction} />
      </section>

      <UnitsTable units={units} orgSlug={fullOrg.slug} orgId={fullOrg.id} />
    </div>
  );
}