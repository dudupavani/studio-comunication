// src/app/(app)/groups/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import MembersTable from "./MembersTable";
import GroupColorSquare from "@/components/groups/GroupColorSquare";
import HeaderEditButton from "@/components/groups/HeaderEditButton";
import AddMembersDrawer from "./AddMembersDrawer";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

// Next 15 pode entregar params como Promise — tipamos para os dois casos
type Params = { groupId: string };
type Props = { params: Params } | { params: Promise<Params> };

function roleLabel(role?: string | null) {
  switch (role) {
    case "platform_admin":
      return "Platform Admin";
    case "org_admin":
      return "Org Admin";
    case "org_master":
      return "Org Master";
    case "unit_master":
      return "Unit Master";
    case "unit_user":
      return "Unit User";
    default:
      return null;
  }
}

export default async function GroupPage(props: Props) {
  // ✅ Resolva params antes de usar (corrige os avisos "params should be awaited")
  const { groupId } = await Promise.resolve((props as any).params as Params);

  const supabase = createClient();
  const serviceSupabase = createServiceClient();

  // Sessão
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id ?? null;

  // Grupo
  const { data: group } = await serviceSupabase
    .from("user_groups")
    .select("id, org_id, name, description, color, created_at")
    .eq("id", groupId)
    .single();

  // Membership do usuário
  let membership: {
    group_id: string;
    user_id: string;
    org_id: string;
    unit_id: string | null;
    added_at: string;
  } | null = null;

  if (userId) {
    const { data: m } = await supabase
      .from("user_group_members")
      .select("group_id, user_id, org_id, unit_id, added_at")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();
    membership = m ?? null;
  }

  // Contagem
  const { count: membersCount } = await serviceSupabase
    .from("user_group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  // Lista de membros (IDs)
  const { data: membersRows } = await serviceSupabase
    .from("user_group_members")
    .select("user_id, unit_id, org_id, added_at")
    .eq("group_id", groupId)
    .order("added_at", { ascending: true });

  const userIds = (membersRows ?? []).map((r) => r.user_id);
  const orgIdsFromMembership = Array.from(
    new Set((membersRows ?? []).map((r) => r.org_id).filter(Boolean))
  );
  const effectiveOrgIds =
    orgIdsFromMembership.length > 0
      ? orgIdsFromMembership
      : group?.org_id
      ? [group.org_id]
      : [];

  // Perfis (nome/avatar)
  let profilesMap: Record<
    string,
    {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null;
    }
  > = {};
  if (userIds.length > 0) {
    const { data: profilesRows } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone")
      .in("id", userIds);
    if (profilesRows)
      profilesMap = Object.fromEntries(profilesRows.map((p) => [p.id, p]));
  }

  // Roles (org_members)
  let rolesMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: orgMembersRows } = await serviceSupabase
      .from("org_members")
      .select("user_id, org_id, role")
      .in("user_id", userIds);

    if (orgMembersRows) {
      const temp = new Map<string, string>();
      orgMembersRows.forEach((row) => {
        const key = row.user_id;
        // Prioriza orgs do grupo; se não houver, fica com a primeira encontrada
        if (!temp.has(key)) {
          temp.set(key, row.role);
        }
        if (
          effectiveOrgIds.length > 0 &&
          effectiveOrgIds.includes(row.org_id) &&
          temp.get(key) !== row.role
        ) {
          temp.set(key, row.role);
        }
      });
      rolesMap = Object.fromEntries(temp);
    }
  }

  // Employee profiles (cargo)
  let employeeProfileCargo: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: employeeRows } = await serviceSupabase
      .from("employee_profile")
      .select("user_id, org_id, cargo")
      .in("user_id", userIds);

    if (employeeRows) {
      const temp = new Map<string, string | null>();
      employeeRows.forEach((row) => {
        const key = row.user_id;
        if (!temp.has(key)) {
          temp.set(key, row.cargo ?? null);
        }
        if (
          effectiveOrgIds.length > 0 &&
          effectiveOrgIds.includes(row.org_id) &&
          temp.get(key) !== row.cargo
        ) {
          temp.set(key, row.cargo ?? null);
        }
      });
      employeeProfileCargo = Object.fromEntries(temp);
    }
  }

  // Identidades (email via RPC)
  type IdentityRow = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    org_id: string;
  };
  let identityById: Record<string, IdentityRow> = {};
  if (userIds.length > 0) {
    const svc = createServiceClient();
    const { data: identities } = await svc.rpc("get_user_identity_many", {
      p_user_ids: userIds,
    });
    if (Array.isArray(identities)) {
      identityById = Object.fromEntries(
        (identities as IdentityRow[]).map((r) => [r.user_id, r])
      );
    }
  }

  // Grupos por usuário
  let userGroupsMap: Record<
    string,
    Array<{ id: string; name: string; color?: string | null }>
  > = {};
  if (userIds.length > 0) {
    const { data: groupsRows } = await serviceSupabase
      .from("user_group_members")
      .select("user_id, user_groups ( id, name, color )")
      .in("user_id", userIds);
    if (groupsRows) {
      groupsRows.forEach((row: any) => {
        const uid = row.user_id as string;
        const group = row.user_groups as {
          id: string;
          name: string;
          color?: string | null;
        } | null;
        if (!group) return;
        if (!userGroupsMap[uid]) userGroupsMap[uid] = [];
        userGroupsMap[uid].push({
          id: group.id,
          name: group.name ?? "Grupo",
          color: group.color ?? null,
        });
      });
    }
  }

  // Units (names) para exibir na tabela
  let unitsById: Record<string, string | null> = {};
  const unitIds = Array.from(
    new Set(
      (membersRows ?? [])
        .map((r) => r.unit_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );
  if (unitIds.length > 0) {
    const { data: units } = await serviceSupabase
      .from("units")
      .select("id, name")
      .in("id", unitIds);
    if (units) {
      unitsById = Object.fromEntries(
        units.map((u) => [u.id as string, (u.name as string | null) ?? null])
      );
    }
  }

  // Linhas normalizadas para a tabela
  const rows = (membersRows ?? []).map((m) => {
    const identity = identityById[m.user_id] ?? null;
    const profile = profilesMap[m.user_id] ?? null;
    const name = profile?.full_name ?? identity?.full_name ?? "Sem nome";
    const email = identity?.email ?? null;
    const avatar = profile?.avatar_url ?? null;
    const role = rolesMap[m.user_id] ?? null;
    const cargo = employeeProfileCargo[m.user_id] ?? null;
    const unitName =
      (m.unit_id ? unitsById[m.unit_id as string] ?? null : null) ?? null;

    return {
      id: m.user_id,
      name,
      email,
      avatarUrl: avatar,
      cargo,
      roleLabel: roleLabel(role),
      unitName,
      addedAt: m.added_at,
      groups: userGroupsMap[m.user_id] ?? [],
    };
  });

  return (
    <main className="p-4 sm:p-6 flex flex-col">
      {/* ===== Header do grupo ===== */}
      {group ? (
        <HeaderEditButton
          group={{
            id: group.id,
            orgId: group.org_id,
            name: group.name ?? "",
            description: group.description ?? null,
            color: group.color ?? null,
          }}
          asChild>
          <div className="relative flex items-center justify-between gap-4 mb-8 border border-gray-200 rounded-md p-4 sm:p-4 sm:pr-6 cursor-pointer group hover:bg-muted transition">
            <div className="flex gap-3">
              <div>
                {group.color ? (
                  <GroupColorSquare
                    color={group.color}
                    width="6px"
                    height="100%"
                  />
                ) : null}
              </div>
              <div>
                <h2 className="text-base sm:text-lg">
                  {group.name ?? "Grupo"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {group.description ?? "Sem descrição"}
                </p>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-muted-foreground">
              <Pencil className="h-4 w-4" />
            </div>
          </div>
        </HeaderEditButton>
      ) : (
        <div className="flex items-center justify-between gap-4 mb-8 border border-gray-200 rounded-md p-4 sm:p-4 sm:pr-6">
          <div className="flex gap-3">
            <div />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Grupo</h1>
              <p className="text-sm text-muted-foreground">Sem descrição</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Membros ===== */}
      <section>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold">
            Membros{" "}
            <span className="font-light">({membersCount ?? rows.length})</span>
          </h2>
          {group && <AddMembersDrawer groupId={group.id} />}
        </div>

        {/* ✅ Tabela dinâmica (client) */}
        {group ? (
          <MembersTable
            rows={rows}
            totalCount={membersCount ?? rows.length}
            groupId={group.id}
          />
        ) : null}
      </section>

      {!group && <p>Grupo não encontrado ou sem permissão.</p>}
      {group && !membership && (
        <p className="text-red-600">
          Você não é membro deste grupo (ou não há linha em user_group_members).
        </p>
      )}
    </main>
  );
}
