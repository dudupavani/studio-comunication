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

  const [userResult, unitsResult, rolesResult, teamsResult] = await Promise.all(
    [
      getUserById(id),
      listUnits(auth.orgId),
      getUserRoles(id, auth.orgId),
      supabase
        .from("equipes")
        .select("id, name")
        .eq("org_id", auth.orgId)
        .order("name"),
    ]
  );

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

  return (
    <div className="container flex flex-col pt-8 pb-12 px-8">
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

      <EditUserForm
        userId={id}
        orgId={auth.orgId}
        defaultName={userResult.full_name}
        defaultEmail={userResult.email}
        units={units}
        teams={teams}
        currentRole={userRoles.role}
        currentUnitId={userRoles.unitId}
        currentTeamId={userRoles.teamId}
      />
    </div>
  );
}
