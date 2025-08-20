// src/app/(app)/unidades/[unitSlug]/page.tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUnitBySlug } from "@/lib/actions/units"; // já existe no projeto
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { isOrgAdminFor, isUnitMasterFor } from "@/lib/permissions-org";
import MembersTabServer from "@/components/units/members/members-tab.server";

export default async function UnidadeDetalhePage({ params }: { params: { unitSlug: string } }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // No modo single-org, usamos o orgId do contexto de autenticação
  const orgId = auth?.orgId;
  if (!orgId) redirect("/dashboard");

  const orgRes = await getOrgWithDetails(orgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  const unitRes = await getUnitBySlug(fullOrg.id, params.unitSlug);
  if (!unitRes?.ok || !unitRes?.data) redirect("/unidades");
  const unit = unitRes.data;

  const canPlatform = auth.platformRole === "platform_admin";
  const canOrgAdmin = await isOrgAdminFor(fullOrg.id, auth.userId);
  const canUnitMaster = await isUnitMasterFor(fullOrg.id, unit.id, auth.userId);
  if (!canPlatform && !canOrgAdmin && !canUnitMaster) redirect("/unidades");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Unidade: {unit.name}</h1>
      <MembersTabServer orgId={fullOrg.id} unitId={unit.id} unitSlug={unit.slug} />
    </div>
  );
}