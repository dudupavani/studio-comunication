// src/app/(app)/orgs/[orgSlug]/[unitSlug]/page.tsx
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
import { Text, Users } from "lucide-react";
import MembersTabServer from "@/components/units/members/members-tab.server";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ orgSlug: string; unitSlug: string }>;
}) {
  const { orgSlug, unitSlug } = await params;

  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const orgRes = await getOrg(orgSlug);
  if (!orgRes.ok) redirect("/orgs");
  const org = orgRes.data!;

  const unitRes = await getUnitBySlug(org.id, unitSlug);
  if (!unitRes.ok) redirect(`/orgs/${orgSlug}`);
  const unit = unitRes.data!;

  // Server Action para salvar as configurações básicas
  async function saveSettingsAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();

    if (name && name !== unit.name) {
      await updateUnit(unit.id, name, {
        revalidate: `/orgs/${orgSlug}/${unitSlug}`,
      });
    }
    redirect(`/orgs/${orgSlug}/${unitSlug}`);
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/orgs" className="hover:underline">
          Organizações
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/orgs/${orgSlug}`} className="hover:underline">
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
              <span className="ml-2">Detalhes</span>
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users size={16} />
              <span className="ml-2">Membros</span>
            </TabsTrigger>
          </TabsList>

          {/* === Aba: Detalhes === */}
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
                <Label>Telefone</Label>
                <Input name="phone" type="tel" placeholder="(11) 90000-0000" />
              </div>

              {/* CEP */}
              <div className="grid gap-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" name="cep" placeholder="CEP da unidade" />
              </div>

              {/* Endereço */}
              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Rua, número, bairro, cidade, UF, CEP"
                />
              </div>

              {/* CNPJ */}
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" placeholder="CNPJ da unidade" />
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

              <div className="flex justify-end">
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </TabsContent>

          {/* === Aba: Membros === */}
          <TabsContent value="members" className="mt-6">
            <MembersTabServer
              orgId={org.id}
              unitId={unit.id}
              unitSlug={unitSlug}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
