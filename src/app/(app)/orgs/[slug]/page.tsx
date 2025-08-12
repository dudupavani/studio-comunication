export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrg, updateOrg } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
import { getAuthContext } from "@/lib/auth-context";
import { createUnitAction } from "@/app/(app)/orgs/unit-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function OrgPage({
  params,
}: {
  params: { slug: string };
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const orgRes = await getOrg(params.slug);
  if (!orgRes.ok) redirect("/orgs");
  const org = orgRes.data;

  const unitsRes = await listUnits(org.id);
  const units = unitsRes.ok ? unitsRes.data : [];

  async function renameOrgAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await updateOrg(org.id, name);
    redirect(`/orgs/${org.slug}`);
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
          🏢
        </div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
      </div>

      {/* Renomear organização */}
      <form action={renameOrgAction} className="flex items-center gap-3 mb-10">
        <Input
          name="name"
          defaultValue={org.name}
          placeholder="Nome da organização"
          className="max-w-md"
        />
        <Button type="submit">Salvar</Button>
      </form>

      {/* Criar unidade */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-3">Unidades</h2>
        <form action={createUnitAction} className="flex items-center gap-3">
          <Input
            name="name"
            placeholder="Nome da unidade"
            className="max-w-md"
            required
          />
          <input type="hidden" name="orgId" value={org.id} />
          <input type="hidden" name="slug" value={org.slug} />
          <Button type="submit">Adicionar</Button>
        </form>
      </section>

      {/* Tabela de unidades (sem botão Excluir) */}
      <div className="mt-6 border rounded-lg">
        <div className="grid grid-cols-12 px-4 py-3 text-sm text-muted-foreground border-b">
          <div className="col-span-6">Nome</div>
          <div className="col-span-6">Slug</div>
        </div>

        {units.length === 0 ? (
          <div className="p-6 text-muted-foreground">
            Nenhuma unidade encontrada.
          </div>
        ) : (
          units.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-12 px-4 py-3 border-b items-center">
              <div className="col-span-6">
                <Link
                  href={`/orgs/${org.slug}/${u.slug}`}
                  className="text-primary hover:underline font-medium">
                  {u.name}
                </Link>
              </div>
              <div className="col-span-6 text-muted-foreground">{u.slug}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
