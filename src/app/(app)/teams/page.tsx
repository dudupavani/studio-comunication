// src/app/(app)/teams/page.tsx
export const dynamic = "force-dynamic";

import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import TeamsClient from "@/components/teams/TeamsClient";
import type { OrgUserOption, TeamSummary } from "@/components/teams/types";
import { enrichOrgUsersWithAuthMetadata } from "@/lib/teams/enrich-org-users";

const TEAM_MANAGER_ROLES = new Set([
  "org_admin",
  "org_master",
  "unit_master",
]);

function canAccess(auth: Awaited<ReturnType<typeof getAuthContext>>) {
  if (!auth) return false;
  if (auth.platformRole === "platform_admin") return true;
  return auth.orgRole ? TEAM_MANAGER_ROLES.has(auth.orgRole) : false;
}

export default async function TeamsPage() {
  const auth = await getAuthContext();
  if (!auth) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Equipes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sessão expirada. Faça login novamente.
        </p>
      </div>
    );
  }

  if (!canAccess(auth)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Equipes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não tem permissão para acessar este módulo (somente org_admin,
          org_master ou unit_master).
        </p>
      </div>
    );
  }

  if (!auth.orgId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Equipes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível determinar a organização ativa para o seu usuário.
        </p>
      </div>
    );
  }

  const supabase = createClient();

  const [teamsRes, usersRes] = await Promise.all([
    supabase
      .from("equipes")
      .select(
        `
        id,
        name,
        leader_user_id,
        updated_at,
        leader:profiles!equipes_leader_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        members:equipe_members (
          user_id
        )
      `
      )
      .eq("org_id", auth.orgId)
      .order("name", { ascending: true }),
    supabase
      .from("org_members")
      .select(
        `
        user_id,
        role,
        profiles:profiles!org_members_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq("org_id", auth.orgId),
  ]);

  if (teamsRes.error || usersRes.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Equipes</h1>
        <p className="mt-2 text-sm text-red-600">
          {teamsRes.error
            ? teamsRes.error.message
            : usersRes.error?.message ??
              "Não foi possível carregar os dados."}
        </p>
      </div>
    );
  }

  let orgUsers: OrgUserOption[] =
    usersRes.data
      ?.map((row: any) => ({
        id: row.user_id as string,
        role: (row.role as string) ?? null,
        name: row.profiles?.full_name ?? "Sem nome",
        email: null,
        avatarUrl: row.profiles?.avatar_url ?? null,
      }))
      .sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", {
          sensitivity: "base",
        })
      ) ?? [];

  orgUsers = await enrichOrgUsersWithAuthMetadata(orgUsers);

  const orgUsersMap = new Map(orgUsers.map((user) => [user.id, user]));

  const teams: TeamSummary[] =
    teamsRes.data?.map((team: any) => {
      const members = Array.isArray(team.members)
        ? team.members.map((member: any) => {
            const memberId = member.user_id as string;
            const info = orgUsersMap.get(memberId);
            return {
              id: memberId,
              name: info?.name ?? "Sem nome",
              avatarUrl: info?.avatarUrl ?? null,
            };
          })
        : [];

      const leaderInfo =
        orgUsersMap.get(team.leader_user_id as string) ?? null;

      return {
        id: team.id as string,
        name: team.name as string,
        leaderId: (team.leader_user_id as string) ?? null,
        leaderName: team.leader?.full_name ?? leaderInfo?.name ?? null,
        leaderAvatarUrl:
          team.leader?.avatar_url ?? leaderInfo?.avatarUrl ?? null,
        membersCount: members.length,
        members,
        updatedAt: team.updated_at ?? null,
      };
    }) ?? [];

  return (
    <div className="p-6">
      <TeamsClient
        canManage
        initialTeams={teams}
        orgUsers={orgUsers}
      />
    </div>
  );
}
