import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditUserForm from "@/components/users/edit-user-form";
import { getUserById, getUserRoles } from "@/lib/actions/user"; // <-- SINGULAR
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { listUnits } from "@/lib/actions/units";
import { createClient } from "@/lib/supabase/server";

// Em versões recentes do Next, params pode ser Promise em Server Components
export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 🔐 Verifica permissões
  const auth = await getAuthContext();
  if (!auth) redirect("/");

  if (!canManageUsers(auth)) {
    redirect("/profile");
  }

  // Verifica se tem orgId
  if (!auth.orgId) {
    redirect("/profile");
  }

  const supabase = createClient();

  const [userResult, unitsResult, rolesResult, teamsResult, employeeResult] =
    await Promise.all([
      getUserById(id),
      listUnits(auth.orgId),
      getUserRoles(id, auth.orgId),
      supabase
        .from("equipes")
        .select("id, name")
        .eq("org_id", auth.orgId)
        .order("name"),
      supabase
        .from("employee_profile")
        .select("cargo, data_entrada")
        .eq("org_id", auth.orgId)
        .eq("user_id", id)
        .maybeSingle(),
    ]);

  if (!userResult) {
    notFound();
  }

  const units = unitsResult.ok ? unitsResult.data : [];
  const userRoles = rolesResult.ok
    ? rolesResult.data
    : { role: null, unitId: null, teamId: null };
  const teams =
    teamsResult?.data?.map((team: any) => ({
      id: team.id as string,
      name: team.name as string,
    })) ?? [];

  const employeeProfile = employeeResult?.data ?? null;

  return (
    <div className="container flex flex-col pt-6 pb-20 px-4 sm:pt-8 sm:pb-12 sm:px-8">
      <div className="flex items-center gap-4 mb-8 self-start">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/users">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h3>Detalhes do usuário</h3>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="pt-6">
          <EditUserForm
            userId={id}
            orgId={auth.orgId}
            defaultName={userResult.full_name}
            defaultEmail={userResult.email}
            defaultPhone={userResult.phone}
            defaultCargo={employeeProfile?.cargo ?? null}
            defaultEntryDate={employeeProfile?.data_entrada ?? null}
            units={units}
            teams={teams}
            currentRole={userRoles.role}
            currentUnitId={userRoles.unitId}
            currentTeamId={userRoles.teamId}
          />
        </div>
      </div>
    </div>
  );
}
