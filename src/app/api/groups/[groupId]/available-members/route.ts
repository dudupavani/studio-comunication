import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";
import { resolveIdentityMap } from "@/lib/identity";

const ParamsSchema = z.object({ groupId: z.string().uuid() });

export async function GET(
  _req: Request,
  context: RouteContext<"/api/groups/[groupId]/available-members">
) {
  try {
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
      return NextResponse.json(
        { error: "Erro ao carregar grupo.", details: toLoggableError(groupErr) },
        { status: 500 }
      );
    }
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado." },
        { status: 404 }
      );
    }

    // IDs já no grupo
    const { data: currentMembers, error: membersErr } = await supabase
      .from("user_group_members")
      .select("user_id")
      .eq("group_id", group.id);

    if (membersErr) {
      return NextResponse.json(
        {
          error: "Erro ao carregar membros do grupo.",
          details: toLoggableError(membersErr),
        },
        { status: 500 }
      );
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
      return NextResponse.json(
        {
          error: "Erro ao carregar usuários da organização.",
          details: toLoggableError(orgErr),
        },
        { status: 500 }
      );
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
      return NextResponse.json(
        {
          error: "Erro ao carregar unidades.",
          details: toLoggableError(unitErr),
        },
        { status: 500 }
      );
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
        return NextResponse.json(
          {
            error: "Erro ao carregar nomes das unidades.",
            details: toLoggableError(unitsErr),
          },
          { status: 500 }
        );
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
      return NextResponse.json(
        {
          error: "Erro ao carregar equipes.",
          details: toLoggableError(teamErr),
        },
        { status: 500 }
      );
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
        return NextResponse.json(
          {
            error: "Erro ao carregar nomes das equipes.",
            details: toLoggableError(teamsErr),
          },
          { status: 500 }
        );
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
    return NextResponse.json(
      {
        error: "Erro inesperado ao carregar usuários disponíveis.",
        details: toLoggableError(error),
      },
      { status: 500 }
    );
  }
}
