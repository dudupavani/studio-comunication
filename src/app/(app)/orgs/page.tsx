import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import {
  getOrgWithDetails,
  listAllOrgsForAdmin,
  updateOrgDetails,
} from "@/lib/actions/orgs";
import OrgsTable from "@/components/orgs/orgs-table";
import OrgConfigForm from "@/components/orgs/org-config-form";

export default async function OrgsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  if (auth.platformRole === "platform_admin") {
    const res = await listAllOrgsForAdmin();
    if (!res.ok) {
      return <div className="p-4 text-red-600">Erro: {res.error}</div>;
    }
    return <OrgsTable initialOrgs={res.data} />;
  }

  if (auth.orgRole === "org_admin" || auth.orgRole === "org_master") {
    const orgId = auth.orgId;
    if (!orgId) redirect("/dashboard");

    const orgRes = await getOrgWithDetails(orgId);
    if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
    const fullOrg = orgRes.data;

    async function saveOrgConfig(values: any) {
      "use server";
      return updateOrgDetails(fullOrg.id, values);
    }

    return (
      <div className="p-4 md:p-8">
        <div className="mb-8">
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

  redirect("/dashboard");
}
