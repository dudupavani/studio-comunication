import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { toLoggableError } from "@/lib/log";
import { resolveIdentityMap } from "@/lib/identity";
import { canUsePermission } from "@/lib/permissions/user-functions";

const ParamsSchema = z.object({ groupId: z.string().uuid() });

async function canListAvailableGroupMembers(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>
) {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    (await canUsePermission(auth, "manage_users"))
  );
}

function routeError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  context: RouteContext<"/api/groups/[groupId]/available-members">
) {
  try {
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ error: "no-org" }, { status: 400 });
    if (!(await canListAvailableGroupMembers(auth))) {
      return routeError(403, "forbidden");
    }

    const rawParams = await context.params;
    const parsed = ParamsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { groupId } = parsed.data;

    const supabase = createServiceClient();

    // Grupo e organização
    const { data: group, error: groupErr } = await supabase
      .from("user_groups")
      .select("id, org_id")
      .eq("id", groupId)
      .maybeSingle();

    if (groupErr) {
      console.error("GROUP_AVAILABLE_MEMBERS_GROUP_ERROR", toLoggableError(groupErr));
      return routeError(500, "Erro ao carregar grupo.");
    }
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado." },
        { status: 404 }
      );
    }
    if (group.org_id !== auth.orgId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // IDs já no grupo
    const { data: currentMembers, error: membersErr } = await supabase
      .from("user_group_members")
      .select("user_id")
      .eq("group_id", group.id);

    if (membersErr) {
      console.error("GROUP_AVAILABLE_MEMBERS_CURRENT_ERROR", toLoggableError(membersErr));
      return routeError(500, "Erro ao carregar membros do grupo.");
    }

    const existingIds = new Set(
      (currentMembers ?? []).map((row: any) => row.user_id as string)
    );

    // Todos os usuários da organização
    const { data: orgMembers, error: orgErr } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", group.org_id);

    if (orgErr) {
      console.error("GROUP_AVAILABLE_MEMBERS_ORG_ERROR", toLoggableError(orgErr));
      return routeError(500, "Erro ao carregar usuários da organização.");
    }

    const userIds = Array.from(
      new Set((orgMembers ?? []).map((row: any) => row.user_id as string))
    ).filter((id) => !existingIds.has(id));

    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const identityMap = await resolveIdentityMap(userIds, {
      svc: supabase,
      orgId: group.org_id,
    });

    // unit_members + units
    const unitMap = new Map<string, string | null>();
    const { data: unitMembers, error: unitErr } = await supabase
      .from("unit_members")
      .select("user_id, unit_id")
      .in("user_id", userIds);

    if (unitErr) {
      console.error("GROUP_AVAILABLE_MEMBERS_UNITS_ERROR", toLoggableError(unitErr));
      return routeError(500, "Erro ao carregar unidades.");
    }

    const unitIds = Array.from(
      new Set(
        (unitMembers ?? [])
          .map((row: any) => row.unit_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    const unitNameMap = new Map<string, string | null>();
    if (unitIds.length > 0) {
      const { data: units, error: unitsErr } = await supabase
        .from("units")
        .select("id, name")
        .in("id", unitIds);

      if (unitsErr) {
        console.error("GROUP_AVAILABLE_MEMBERS_UNIT_NAMES_ERROR", toLoggableError(unitsErr));
        return routeError(500, "Erro ao carregar nomes das unidades.");
      }
      (units ?? []).forEach((row: any) =>
        unitNameMap.set(row.id as string, row.name ?? null)
      );
    }

    (unitMembers ?? []).forEach((row: any) => {
      const userId = row.user_id as string;
      const unitId = row.unit_id as string | null;
      if (unitId && !unitMap.has(userId)) {
        unitMap.set(userId, unitNameMap.get(unitId) ?? null);
      } else if (!unitId && !unitMap.has(userId)) {
        unitMap.set(userId, null);
      }
    });

    // equipe_members + equipes
    const teamMap = new Map<string, string | null>();
    const { data: teamMembers, error: teamErr } = await supabase
      .from("equipe_members")
      .select("user_id, equipe_id")
      .eq("org_id", group.org_id)
      .in("user_id", userIds);

    if (teamErr) {
      console.error("GROUP_AVAILABLE_MEMBERS_TEAMS_ERROR", toLoggableError(teamErr));
      return routeError(500, "Erro ao carregar equipes.");
    }

    const teamIds = Array.from(
      new Set(
        (teamMembers ?? [])
          .map((row: any) => row.equipe_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    const teamNameMap = new Map<string, string | null>();
    if (teamIds.length > 0) {
      const { data: teams, error: teamsErr } = await supabase
        .from("equipes")
        .select("id, name")
        .in("id", teamIds);

      if (teamsErr) {
        console.error("GROUP_AVAILABLE_MEMBERS_TEAM_NAMES_ERROR", toLoggableError(teamsErr));
        return routeError(500, "Erro ao carregar nomes das equipes.");
      }
      (teams ?? []).forEach((row: any) =>
        teamNameMap.set(row.id as string, row.name ?? null)
      );
    }

    (teamMembers ?? []).forEach((row: any) => {
      const userId = row.user_id as string;
      const teamId = row.equipe_id as string | null;
      if (teamId && !teamMap.has(userId)) {
        teamMap.set(userId, teamNameMap.get(teamId) ?? null);
      } else if (!teamId && !teamMap.has(userId)) {
        teamMap.set(userId, null);
      }
    });

    const users = userIds.map((id) => {
      const identity = identityMap.get(id);
      return {
        id,
        name: identity?.full_name ?? identity?.email ?? null,
        cargo: identity?.title ?? null,
        unitName: unitMap.get(id) ?? null,
        teamName: teamMap.get(id) ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GROUP_AVAILABLE_MEMBERS_UNEXPECTED_ERROR", toLoggableError(error));
    return routeError(500, "Erro inesperado ao carregar usuários disponíveis.");
  }
}
