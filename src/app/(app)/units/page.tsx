// src/app/(app)/units/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
// ✅ Renomeamos a importação para evitar conflito de nome com o wrapper local
import { createUnitAction as createUnit } from "@/app/(app)/units/unit-actions";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import UnitsTable from "@/components/units/units-table";
import { isOrgAdminFor } from "@/lib/permissions-org";
import { canUsePermission } from "@/lib/permissions/user-functions";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { House } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 20;

function buildPageUrl(page: number, currentSearchParams: string) {
  const params = new URLSearchParams(currentSearchParams);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const pageParam = sp?.page;
  const currentPage = Math.max(
    1,
    parseInt((Array.isArray(pageParam) ? pageParam[0] : pageParam) ?? "1", 10) || 1
  );
  const searchParamsString = new URLSearchParams(
    Object.entries(sp ?? {}).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : []
    )
  ).toString();

  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units auth:", {
      userId: auth?.userId,
      platformRole: auth?.platformRole,
      orgId: auth?.orgId,
      orgRole: auth?.orgRole,
    });
  }
  if (!auth) redirect("/login");

  // No modo single-org, usamos o orgId do contexto de autenticação
  const orgId = auth?.orgId;
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units orgId from auth:", orgId);
  }
  const effectiveOrgId = auth.platformRole === "platform_admin" ? (orgId ?? auth.userId ?? undefined) : orgId;
  if (!effectiveOrgId) redirect("/dashboard");

  const orgRes = await getOrgWithDetails(effectiveOrgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  const canAdmin =
    auth.platformRole === "platform_admin" ||
    (auth.orgRole === "org_master" &&
      (await canUsePermission(auth, "manage_units"))) ||
    (await isOrgAdminFor(fullOrg.id, auth.userId));
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /units guards:", { canAdmin });
  }
  if (!canAdmin) redirect("/dashboard");

  const unitsRes = await listUnits(fullOrg.id, { page: currentPage, pageSize: PAGE_SIZE });
  const units = unitsRes.ok ? unitsRes.data ?? [] : [];
  const totalUnits = unitsRes.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUnits / PAGE_SIZE));

  // ✅ Wrapper com a assinatura que o AddUnitModal espera: (formData) => Promise<void>
  //    Ele extrai "name" do form, usa orgId do contexto e chama sua action original (orgId, name).
  async function createUnitFormAction(formData: FormData): Promise<void> {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Nome da unidade é obrigatório.");
    }

    const res = await createUnit(fullOrg.id, name);
    if (!res?.ok) {
      throw new Error(res?.error ?? "Erro ao criar unidade");
    }

    // Se a sua createUnit já faz revalidatePath, não precisa repetir aqui.
    // Caso contrário, podemos revalidar aqui futuramente.
  }

  // Removido o redirecionamento automático para a primeira unidade
  // Agora a página sempre mostra a lista de unidades

  if (units.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <House />
            </EmptyMedia>
            <EmptyTitle>Nenhuma unidade encontrada</EmptyTitle>
            <EmptyDescription>
              Crie a primeira unidade para começar a organizar sua operação.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddUnitModal
              orgId={fullOrg.id}
              slug={fullOrg.slug}
              action={createUnitFormAction}
            />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6">
      <section className="flex justify-between items-center mb-4">
        <h1>Unidades</h1>
        <AddUnitModal
          orgId={fullOrg.id}
          slug={fullOrg.slug}
          action={createUnitFormAction} // ✅ assinatura correta
        />
      </section>

      <UnitsTable units={units} orgSlug={fullOrg.slug} orgId={fullOrg.id} />

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={buildPageUrl(currentPage - 1, searchParamsString)}
                  aria-disabled={currentPage <= 1}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                  if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href={buildPageUrl(item, searchParamsString)}
                        isActive={item === currentPage}>
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

              <PaginationItem>
                <PaginationNext
                  href={buildPageUrl(currentPage + 1, searchParamsString)}
                  aria-disabled={currentPage >= totalPages}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
