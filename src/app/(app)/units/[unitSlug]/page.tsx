// src/app/(app)/units/[unitSlug]/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUnitBySlug } from "@/lib/actions/units";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { isOrgAdminFor, isUnitMasterFor } from "@/lib/permissions-org";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MembersTabServer from "@/components/units/members/members-tab.server";
import UnitDetailsForm from "@/components/units/unit-details-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitSlug: string }>;
}) {
  // In newer versions of Next.js, params is a Promise that must be awaited
  const { unitSlug } = await params;

  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // No modo single-org, usamos o orgId do contexto de autenticação
  const orgId = auth?.orgId;
  if (!orgId) redirect("/dashboard");

  const orgRes = await getOrgWithDetails(orgId);
  if (!orgRes?.ok || !orgRes?.data) redirect("/dashboard");
  const fullOrg = orgRes.data;

  const unitRes = await getUnitBySlug(fullOrg.id, unitSlug);
  if (!unitRes?.ok || !unitRes?.data) redirect("/units");
  const unit = unitRes.data;

  const canPlatform = auth.platformRole === "platform_admin";
  const canOrgAdmin = await isOrgAdminFor(fullOrg.id, auth.userId);

  // ✅ só consulta isUnitMasterFor se realmente necessário
  let canUnitMaster = false;
  if (!canPlatform && !canOrgAdmin) {
    canUnitMaster = await isUnitMasterFor(fullOrg.id, unit.id, auth.userId);
  }

  if (!canPlatform && !canOrgAdmin && !canUnitMaster) redirect("/units");

  return (
    <div className="p-8">
      <div className="flex items-censtartter gap-4 mb-8 self-start">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/units">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h2>{unit.name}</h2>
          <p className="text-sm text-muted-foreground">
            Configurações da unidade
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-4">
          <UnitDetailsForm unit={unit} />
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          <MembersTabServer
            orgId={fullOrg.id}
            unitId={unit.id}
            unitSlug={unit.slug}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
