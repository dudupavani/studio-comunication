// src/app/(app)/settings/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getActiveOrgForSidebar } from "@/lib/active-org";
import { getOrgWithDetails, updateOrgDetails } from "@/lib/actions/orgs"; // ajuste se o nome for outro
import OrgConfigForm from "@/components/orgs/org-config-form";
import { isOrgAdminFor } from "@/lib/permissions-org";

export default async function SettingsPage() {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings auth:", {
      userId: auth?.userId, platformRole: auth?.platformRole, orgId: auth?.orgId, orgRole: auth?.orgRole
    });
  }
  if (!auth) redirect("/login");

  const { org } = await getActiveOrgForSidebar();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings activeOrg:", { id: org?.id, slug: org?.slug, name: org?.name });
  }
  if (!org) redirect("/dashboard"); // sem org ativa, volta para o dashboard

  // Carrega os detalhes completos (reutilizando o helper por slug para não depender de ID no form)
  const orgRes = await getOrgWithDetails(org.slug);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  // Guard: apenas org_admin daquela org (platform_admin opcional)
  const canAdmin = auth.platformRole === "platform_admin" || await isOrgAdminFor(fullOrg.id, auth.userId);
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings guards:", { canPlatform: auth.platformRole === "platform_admin", canOrgAdmin: await isOrgAdminFor(fullOrg.id, auth.userId) });
  }
  if (!canAdmin) redirect("/dashboard");

  async function saveOrgConfig(values: any) {
    "use server";
    const res = await updateOrgDetails(fullOrg.id, values);
    return res;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold mb-1">Configuração</h1>
      <OrgConfigForm
        org={{
          id: fullOrg.id,
          name: fullOrg.name ?? "",
          cnpj: fullOrg.cnpj ?? "",
          address: fullOrg.address ?? "",
          phone: fullOrg.phone ?? "",
          cep: fullOrg.cep ?? "",
          city: fullOrg.city ?? "",
          state: fullOrg.state ?? "",
        }}
        canEdit={true}
        onSubmit={saveOrgConfig}
      />
    </div>
  );
}