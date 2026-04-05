// src/app/(app)/settings/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails, updateOrgDetails } from "@/lib/actions/orgs"; // ajuste se o nome for outro
import OrgConfigForm from "@/components/orgs/org-config-form";
import { isOrgAdminFor } from "@/lib/permissions-org";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings auth:", {
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
    console.log("DEBUG /settings orgId from auth:", orgId);
  }
  if (!orgId) redirect("/dashboard"); // sem org ativa, volta para o dashboard

  // Carrega os detalhes completos da organização
  const orgRes = await getOrgWithDetails(orgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  // Guard: apenas org_admin daquela org (platform_admin opcional)
  const canAdmin =
    auth.platformRole === "platform_admin" ||
    (await isOrgAdminFor(fullOrg.id, auth.userId));
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /settings guards:", {
      canPlatform: auth.platformRole === "platform_admin",
      canOrgAdmin: await isOrgAdminFor(fullOrg.id, auth.userId),
    });
  }
  if (!canAdmin) redirect("/dashboard");

  async function saveOrgConfig(values: any) {
    "use server";
    const res = await updateOrgDetails(fullOrg.id, values);
    return res;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/orgs" aria-label="Organizações">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1>Dados da organização</h1>
      </div>
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
