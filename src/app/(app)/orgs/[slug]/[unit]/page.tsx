import { getAuthContext } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import { getOrg } from "@/lib/actions/orgs";
import { getUnitBySlug } from "@/lib/actions/units";

export default async function UnitPage({
  params,
}: {
  params: { slug: string; unit: string };
}) {
  const auth = await getAuthContext();
  if (!auth) return redirect("/");

  const orgResult = await getOrg(params.slug);
  if (!orgResult.ok) return redirect("/orgs");

  const org = orgResult.data;

  const unitResult = await getUnitBySlug(org.id, params.unit);
  if (!unitResult.ok) return redirect(`/orgs/${org.slug}`);

  const unit = unitResult.data;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Unidade: {unit.name}</h1>
      <p className="text-muted-foreground text-sm">Organização: {org.name}</p>
    </div>
  );
}
