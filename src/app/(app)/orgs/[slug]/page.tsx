// src/app/(app)/orgs/[slug]/page.tsx
import { redirect } from "next/navigation";
import { listUnits, createUnit } from "@/lib/actions/units";
import { getOrg, updateOrg } from "@/lib/actions/orgs";
import UnitsTable from "@/components/units/units-table";

export default async function OrgDetailPage({
  params,
}: {
  // Next 15: params é assíncrono
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const orgRes = await getOrg(slug);
  if (!orgRes.ok) redirect("/orgs");
  const org = orgRes.data;

  // carrega unidades
  const units = await listUnits(org.id);

  // criar uma unidade
  async function createUnitAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "");
    await createUnit(org.id, name);
  }

  // renomear organização (slug pode mudar)
  async function renameOrgAction(formData: FormData) {
    "use server";
    const newName = String(formData.get("newName") ?? "").trim();
    if (!newName) return;
    const res = await updateOrg(org.id, newName);
    if (res.ok && res.data?.slug && res.data.slug !== org.slug) {
      redirect(`/orgs/${res.data.slug}`);
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Renomear organização */}
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">{org.name}</h1>

        <form action={renameOrgAction} className="flex gap-2">
          <input
            name="newName"
            placeholder="Novo nome da organização"
            className="border rounded px-3 py-2"
            defaultValue={org.name}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white">
            Salvar nome
          </button>
        </form>
      </section>

      {/* Unidades */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Unidades</h2>

        <form action={createUnitAction} className="flex gap-2">
          <input
            name="name"
            placeholder="Nome da unidade"
            className="border rounded px-3 py-2"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-black text-white">
            Adicionar
          </button>
        </form>

        {!units.ok ? (
          <p className="text-red-600">{units.error}</p>
        ) : (
          <UnitsTable orgId={org.id} orgSlug={org.slug} units={units.data} />
        )}
      </section>
    </div>
  );
}
