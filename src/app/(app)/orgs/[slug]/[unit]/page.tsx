export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth-context";
import { getOrg } from "@/lib/actions/orgs";
import { getUnitBySlug, updateUnit } from "@/lib/actions/units";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Text, Users } from "lucide-react";
export default async function UnitPage({
  params,
}: {
  params: { slug: string; unit: string };
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const orgRes = await getOrg(params.slug);
  if (!orgRes.ok) redirect("/orgs");
  const org = orgRes.data;

  const unitRes = await getUnitBySlug(org.id, params.unit);
  if (!unitRes.ok) redirect(`/orgs/${org.slug}`);
  const unit = unitRes.data;

  // Server Action para salvar as configurações básicas
  async function saveSettingsAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();

    // Campos já previstos para a segunda etapa (serão persistidos quando criarmos as colunas/metadata)
    // const phone1 = String(formData.get("phone1") ?? "").trim();
    // const phone2 = String(formData.get("phone2") ?? "").trim();
    // const address = String(formData.get("address") ?? "").trim();
    // const managerName = String(formData.get("managerName") ?? "").trim();
    // const managerEmail = String(formData.get("managerEmail") ?? "").trim();

    if (name && name !== unit.name) {
      await updateUnit(unit.id, name, {
        revalidate: `/orgs/${org.slug}/${unit.slug}`,
      });
    }

    // No futuro, aqui faremos um update extra (metadata/colunas) com os demais campos.
    // Por ora, apenas revalidamos a rota.
    redirect(`/orgs/${org.slug}/${unit.slug}`);
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/orgs" className="hover:underline">
          Organizações
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/orgs/${org.slug}`} className="hover:underline">
          {org.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">{unit.name}</span>
      </div>

      <h1 className="text-3xl font-bold mb-2">{unit.name}</h1>

      <div className="mt-8">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList>
            <TabsTrigger value="settings">
              <Text size={16} />
              <span className="ml-2">Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users size={16} />
              <span className="ml-2">Membros</span>
            </TabsTrigger>
          </TabsList>

          {/* === Aba: Configurações === */}
          <TabsContent value="settings" className="mt-6">
            <form action={saveSettingsAction} className="space-y-6 max-w-2xl">
              {/* Nome */}
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={unit.name}
                  placeholder="Ex.: Unidade Centro"
                  required
                />
              </div>

              {/* Contatos */}
              <div className="grid gap-2">
                <Label>Contato</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    name="phone1"
                    type="tel"
                    placeholder="Telefone 1 (ex.: (11) 90000-0000)"
                  />
                  <Input
                    name="phone2"
                    type="tel"
                    placeholder="Telefone 2 (opcional)"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="Rua, número, bairro, cidade, UF, CEP"
                />
              </div>

              {/* Responsável (unit_master) */}
              <div className="grid gap-2">
                <Label htmlFor="managerName">Responsável (unit_master)</Label>
                <Input
                  id="managerName"
                  name="managerName"
                  placeholder="Nome do responsável"
                />
              </div>

              {/* E-mail do responsável */}
              <div className="grid gap-2">
                <Label htmlFor="managerEmail">E-mail do responsável</Label>
                <Input
                  id="managerEmail"
                  name="managerEmail"
                  type="email"
                  placeholder="responsavel@exemplo.com"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Salvar alterações</Button>
              </div>
            </form>
          </TabsContent>

          {/* === Aba: Membros (placeholder, vamos implementar depois) === */}
          <TabsContent value="members" className="mt-6">
            <p className="text-muted-foreground">
              Lista de membros da unidade e botão para adicionar/remover
              usuários.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
