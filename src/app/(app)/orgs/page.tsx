import { listMyOrgs } from "@/lib/actions/orgs";
import OrgsTable from "@/components/orgs/orgs-table";

export default async function OrgsPage() {
  const res = await listMyOrgs();
  if (!res.ok) {
    return <div className="p-4 text-red-600">Erro: {res.error}</div>;
  }
  return <OrgsTable initialOrgs={res.data} />;
}
