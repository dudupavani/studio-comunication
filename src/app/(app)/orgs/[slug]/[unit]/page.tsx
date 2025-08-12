export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth-context";
import { getOrg } from "@/lib/actions/orgs";
import { getUnitBySlug } from "@/lib/actions/units";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

  return (
    <div className="p-6">
      <div className="mb-6 text-sm text-muted-foreground">
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

      <h1 className="text-2xl font-bold mb-2">{unit.name}</h1>

      <div className="mt-8">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            {/* Placeholder – aqui entraremos com o formulário da unidade */}
            <p className="text-muted-foreground">
              Formulário de configuração da unidade (nome, slug, contatos,
              etc.).
            </p>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            {/* Placeholder – aqui entraremos com a tabela de membros e o modal */}
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
