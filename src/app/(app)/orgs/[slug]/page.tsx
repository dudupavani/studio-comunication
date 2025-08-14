// src/app/(app)/orgs/[slug]/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrg, updateOrg } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
import { getAuthContext } from "@/lib/auth-context";
import { createUnitAction } from "@/app/(app)/orgs/unit-actions";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import { Pencil } from "lucide-react";

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
  params: { slug: string };
  searchParams?: { tab?: string; sort?: string; dir?: string };
}) {
  const { slug } = params;

  const auth = await getAuthContext();
  if (!auth) redirect("/");

  const orgRes = await getOrg(slug);
  if (!orgRes.ok || !orgRes.data) redirect("/orgs");
  const org = orgRes.data;

  const unitsRes = await listUnits(org.id);
  const units = unitsRes.ok ? unitsRes.data ?? [] : [];

  // ---------------------------
  // Ordenação (server-side)
  // ---------------------------
  const tab = searchParams?.tab === "units" ? "units" : "config";
  const sortParam = (searchParams?.sort as SortKey) ?? "name";
  const dirParam = (searchParams?.dir as SortDir) ?? "asc";

  const sortKey: SortKey = sortParam === "phone" ? "phone" : "name";
  const sortDir: SortDir = dirParam === "desc" ? "desc" : "asc";

  const sortedUnits = [...units].sort((a: any, b: any) => {
    const aVal = String(a?.[sortKey] ?? "").toLowerCase();
    const bVal = String(b?.[sortKey] ?? "").toLowerCase();
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  // helper para montar links de ordenação mantendo ?tab=units
  function sortHref(key: SortKey) {
    const isActive = sortKey === key;
    const nextDir: SortDir = isActive && sortDir === "asc" ? "desc" : "asc";
    const sp = new URLSearchParams();
    sp.set("tab", "units");
    sp.set("sort", key);
    sp.set("dir", nextDir);
    return `?${sp.toString()}`;
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  // ⬇️ Server Action para salvar configurações da organização
  async function saveOrgConfig(values: OrgFormValues) {
    "use server";
    try {
      await updateOrg(org.id, {
        name: values.name,
        cnpj: values.cnpj,
        address: (values as any).address,
        phone: (values as any).phone,
        cep: (values as any).cep,
        cidade: (values as any).cidade,
        estado: (values as any).estado,
      } as any);

      return { ok: true as const };
    } catch (e: any) {
      console.error("updateOrg error:", e);
      return { ok: false as const, error: e?.message ?? "Erro ao salvar" };
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-2xl">
          🏢
        </div>
        <h1 className="text-2xl font-bold">{org.name}</h1>
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config">Dados da organização</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
        </TabsList>

        {/* Configurações da organização */}
        <TabsContent value="config" className="space-y-6">
          <div className="mb-2">
            <h2 className="text-2xl font-semibold mb-1">
              Dados da organização
            </h2>
          </div>
          <OrgConfigForm
            org={{
              id: org.id,
              name: org.name ?? "",
              cnpj: (org as any).cnpj ?? "",
              address: (org as any).address ?? "",
              phone: (org as any).phone ?? "",
              cep: (org as any).cep ?? "",
              cidade: (org as any).cidade ?? "",
              estado: (org as any).estado ?? "",
            }}
            // se tiver checagem de permissão, troque por canManageOrg(auth, org.id)
            canEdit={true}
            onSubmit={saveOrgConfig}
          />
        </TabsContent>

        {/* Unidades da organização */}
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
                        className="font-semibold text-primary hover:underline font-medium">
                        {u.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-primary">
                      {u.phone ?? ""}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" asChild>
                        <Link href={`/orgs/${org.slug}/${u.slug}`}>
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
