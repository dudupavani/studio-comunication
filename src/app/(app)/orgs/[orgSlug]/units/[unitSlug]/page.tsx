// src/app/(app)/orgs/[orgSlug]/units/[unitSlug]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getOrg } from "@/lib/actions/orgs";
import { getUnitBySlug, updateUnit } from "@/lib/actions/units";

import ConfirmDialog from "@/components/ui/confirm-dialog";
import { deleteUnitAction } from "@/app/(app)/orgs/unit-actions";

export default async function UnitPage({
  params,
}: {
  // Next 15+: params é assíncrono
  params: Promise<{ orgSlug: string; unitSlug: string }>;
}) {
  const { orgSlug, unitSlug } = await params;

  // carrega org + unidade por slug
  const orgRes = await getOrg(orgSlug);
  if (!orgRes.ok) redirect("/orgs");
  const org = orgRes.data;

  const unitRes = await getUnitBySlug(org.id, unitSlug);
  if (!unitRes.ok) redirect(`/orgs/${org.slug}`);
  const unit = unitRes.data;

  // server action de salvar (inline na RSC)
  async function save(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "");
    const address = String(formData.get("address") ?? "");
    const cnpj = String(formData.get("cnpj") ?? "");
    const phone = String(formData.get("phone") ?? "");

    // updateUnit espera: (unitId, newName, opts?)
    // Então precisamos atualizar os campos extras separadamente após o nome
    const res = await updateUnit(unit.id, name);
    if (!res.ok) {
      return;
    }
    // Atualiza os campos extras se necessário
    const supabase = (await import("@/lib/supabase/server")).createClient();
    await supabase
      .from("units")
      .update({ address, cnpj, phone })
      .eq("id", unit.id);

    if (!res.ok) {
      // poderia exibir um toast via cookies/headers; por ora apenas retorna
      return;
    }

    // se o nome mudou, o slug pode mudar -> redirecionar para o slug novo
    if (res.data?.slug && res.data.slug !== unit.slug) {
      redirect(`/orgs/${org.slug}/units/${res.data.slug}`);
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header com botão VOLTAR e excluir */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${org.slug}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
            aria-label="Voltar para a organização">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">
            {org.name} <span className="text-muted-foreground">»</span>{" "}
            {unit.name}
          </h1>
        </div>

        <ConfirmDialog
          trigger={
            <button className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600">
              Excluir unidade
            </button>
          }
          title="Excluir unidade?"
          description="Essa ação é irreversível. Tem certeza que deseja excluir esta unidade?"
          confirmText="Excluir"
          danger
          action={deleteUnitAction}
          hidden={{
            orgId: org.id,
            unitId: unit.id,
            redirectTo: `/orgs/${org.slug}`,
          }}
        />
      </div>

      {/* Form */}
      <form action={save} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            name="name"
            defaultValue={unit.name ?? ""}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Nome da unidade"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Endereço</label>
          <input
            name="address"
            defaultValue={unit.address ?? ""}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Endereço"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">CNPJ</label>
            <input
              name="cnpj"
              defaultValue={unit.cnpj ?? ""}
              className="w-full rounded-md border px-3 py-2"
              placeholder="CNPJ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input
              name="phone"
              defaultValue={unit.phone ?? ""}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Telefone"
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-black/90">
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
