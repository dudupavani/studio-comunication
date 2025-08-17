// src/app/(app)/orgs/[orgSlug]/page.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOrgWithDetails,
  getOrgAdmins,
  updateOrgDetails,
} from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
import { getAuthContext } from "@/lib/auth-context";
import { createUnitAction } from "@/app/(app)/orgs/unit-actions";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import { Building2, Pencil } from "lucide-react";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrgConfigForm, {
  type OrgFormValues,
} from "@/components/orgs/org-config-form";

type SortKey = "name" | "phone";
type SortDir = "asc" | "desc";

export default async function OrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<{ tab?: string; sort?: string; dir?: string }>;
}) {
  const { orgSlug } = await params;
  const sp = (await searchParams) ?? {};

  const auth = await getAuthContext();
  if (!auth) redirect("/");

  // 🔐 se ainda precisa trocar a senha, redireciona
  if (auth.user?.user_metadata?.must_reset_password) {
    redirect("/auth/force-password");
  }

  const orgRes = await getOrgWithDetails(orgSlug);
  if (!orgRes.ok || !orgRes.data) {
    console.error("ORG PAGE — getOrgWithDetails failed:", orgRes);
    redirect("/orgs");
  }
  const org = orgRes.data;

  const adminsRes = await getOrgAdmins(org.id);
  const admins = adminsRes.ok ? adminsRes.data ?? [] : [];

  const unitsRes = await listUnits(org.id);
  const units = unitsRes.ok ? unitsRes.data ?? [] : [];

  const tab = sp.tab === "units" ? "units" : "config";
  const sortParam = (sp.sort as SortKey) ?? "name";
  const dirParam = (sp.dir as SortDir) ?? "asc";

  const sortKey: SortKey = sortParam === "phone" ? "phone" : "name";
  const sortDir: SortDir = dirParam === "desc" ? "desc" : "asc";

  const sortedUnits = [...units].sort((a: any, b: any) => {
    const aVal = String(a?.[sortKey] ?? "").toLowerCase();
    const bVal = String(b?.[sortKey] ?? "").toLowerCase();
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function sortHref(key: SortKey) {
    const isActive = sortKey === key;
    const nextDir: SortDir = isActive && sortDir === "asc" ? "desc" : "asc";
    const usp = new URLSearchParams();
    usp.set("tab", "units");
    usp.set("sort", key);
    usp.set("dir", nextDir);
    return `?${usp.toString()}`;
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  // ⬇️ Server Action para salvar configurações da organização
  async function saveOrgConfig(values: OrgFormValues) {
    "use server";
    const res = await updateOrgDetails(org.id, {
      name: values.name,
      cnpj: values.cnpj,
      address: values.address,
      phone: values.phone,
      cep: values.cep,
      city: values.city, // antes era cidade
      state: values.state, // antes era estado
    });

    if (!res.ok) {
      console.error("updateOrgDetails failed:", res.error);
      return { ok: false as const, error: res.error ?? "Erro ao salvar" };
    }
    return { ok: true as const };
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-2xl">
          <Building2 className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
      </div>

      {/* Responsáveis */}
      <div className="mb-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground mr-1">
            Responsável:
          </span>

          {admins.length > 0 ? (
            <ul className="space-y-1">
              {admins.map((adm: any) => (
                <li key={adm.id} className="text-sm">
                  <span className="font-semibold">
                    {adm.full_name ?? "Sem nome"}
                  </span>{" "}
                  - <span>{adm.phone ?? "Telefone não informado"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum <code>org_admin</code> definido para esta organização.
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config">Dados da organização</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
        </TabsList>

        {/* Configurações da organização */}
        <TabsContent value="config" className="space-y-6">
          <h2 className="text-2xl font-semibold mb-1">Dados da organização</h2>
          <OrgConfigForm
            org={{
              id: org.id,
              name: org.name ?? "",
              cnpj: org.cnpj ?? "",
              address: org.address ?? "",
              phone: org.phone ?? "",
              cep: org.cep ?? "",
              city: org.city ?? "",
              state: org.state ?? "",
            }}
            canEdit={true}
            onSubmit={saveOrgConfig}
          />
        </TabsContent>

        {/* Unidades */}
        <TabsContent value="units" className="space-y-6">
          <section className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold">
              Unidades{" "}
              <span className="font-light text-gray-500">({units.length})</span>
            </h2>
            <AddUnitModal
              orgId={org.id}
              slug={org.slug}
              action={createUnitAction}
            />
          </section>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Link
                    href={sortHref("name")}
                    className="inline-flex items-center gap-1 hover:underline"
                    prefetch={false}>
                    Nome{" "}
                    <span className="text-muted-foreground">
                      {sortIndicator("name")}
                    </span>
                  </Link>
                </TableHead>
                <TableHead>
                  <Link
                    href={sortHref("phone")}
                    className="inline-flex items-center gap-1 hover:underline"
                    prefetch={false}>
                    Telefone{" "}
                    <span className="text-muted-foreground">
                      {sortIndicator("phone")}
                    </span>
                  </Link>
                </TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedUnits.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground">
                    Nenhuma unidade encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUnits.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        href={`/orgs/${org.slug}/${u.slug}`}
                        className="font-semibold text-primary hover:underline font-medium"
                        prefetch={false}>
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-primary">
                      {u.phone ?? ""}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" asChild>
                        <Link
                          href={`/orgs/${org.slug}/${u.slug}`}
                          prefetch={false}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
