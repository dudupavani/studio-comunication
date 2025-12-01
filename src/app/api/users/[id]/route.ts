import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const ParamsSchema = z.object({ id: z.string().uuid() });

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function resolveParams<T = any>(ctx: unknown): Promise<T> {
  const resolved = await Promise.resolve(ctx as any);
  return (resolved?.params ?? resolved) as T;
}

export async function GET(
  _req: Request,
  ctx: { params: { id: string } } | Promise<{ params: { id: string } }>
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return jsonError(401, "É preciso estar autenticado.");
    }
    if (!canManageUsers(auth)) {
      return jsonError(403, "Apenas gestores podem acessar este recurso.");
    }
    if (!auth.orgId) {
      return jsonError(400, "Organização ativa não encontrada para o usuário.");
    }

    const rawParams = await resolveParams<{ id: string }>(ctx);
    const parsedParams = ParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }
    const targetUserId = parsedParams.data.id;
    const orgId = auth.orgId;

    const svc = createServiceClient();

    const { data: membership, error: membershipErr } = await svc
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (membershipErr) {
      return jsonError(
        500,
        "Erro ao validar participação do usuário na organização.",
        toLoggableError(membershipErr)
      );
    }
    if (!membership) {
      return jsonError(404, "Colaborador não encontrado nesta organização.");
    }

    const [profileRes, authUserRes, employeeRes, unitsRes, teamsRes, orgTeamsRes] =
      await Promise.all([
        svc
          .from("profiles")
          .select("id, full_name, phone, avatar_url")
          .eq("id", targetUserId)
          .maybeSingle(),
        svc.auth.admin.getUserById(targetUserId),
        svc
          .from("employee_profile")
          .select("cargo, data_entrada, time_principal_id")
          .eq("org_id", orgId)
          .eq("user_id", targetUserId)
          .maybeSingle(),
        svc
          .from("unit_members")
          .select(
            `
          unit_id,
          units!inner (
            id,
            name,
            slug
          )
        `
          )
          .eq("user_id", targetUserId)
          .eq("org_id", orgId),
        svc
          .from("equipe_members")
          .select(
            `
          equipe_id,
          equipes!inner (
            id,
            name
          )
        `
          )
          .eq("user_id", targetUserId)
          .eq("org_id", orgId),
        svc
          .from("equipes")
          .select("id, name")
          .eq("org_id", orgId)
          .order("name"),
      ]);

    if (profileRes.error) {
      return jsonError(
        500,
        "Erro ao carregar dados pessoais.",
        toLoggableError(profileRes.error)
      );
    }
    if (authUserRes.error) {
      return jsonError(
        500,
        "Erro ao carregar credenciais do colaborador.",
        toLoggableError(authUserRes.error)
      );
    }
    if (employeeRes.error) {
      return jsonError(
        500,
        "Erro ao carregar dados corporativos.",
        toLoggableError(employeeRes.error)
      );
    }
    if (unitsRes.error) {
      return jsonError(
        500,
        "Erro ao carregar unidades do colaborador.",
        toLoggableError(unitsRes.error)
      );
    }
    if (teamsRes.error) {
      return jsonError(
        500,
        "Erro ao carregar equipes do colaborador.",
        toLoggableError(teamsRes.error)
      );
    }
    if (orgTeamsRes.error) {
      return jsonError(
        500,
        "Erro ao carregar equipes da organização.",
        toLoggableError(orgTeamsRes.error)
      );
    }

    const profile = profileRes.data;
    const authUser = authUserRes.data?.user ?? null;
    const employeeProfile = employeeRes?.data ?? null;

    const unitMemberships =
      unitsRes.data?.map((row: any) => ({
        id: row.unit_id as string,
        name: row.units?.name ?? null,
        slug: row.units?.slug ?? null,
      })) ?? [];

    const teamMemberships =
      teamsRes.data?.map((row: any) => ({
        id: row.equipe_id as string,
        name: row.equipes?.name ?? null,
      })) ?? [];

    const availableTeams =
      orgTeamsRes.data?.map((row: any) => ({
        id: row.id as string,
        name: row.name as string,
      })) ?? [];

    return NextResponse.json({
      profile: {
        id: profile?.id ?? targetUserId,
        email: authUser?.email ?? null,
        fullName: profile?.full_name ?? authUser?.user_metadata?.name ?? null,
        phone: profile?.phone ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
      orgMember: {
        orgId,
        role: membership.role ?? null,
      },
      employeeProfile: {
        cargo: employeeProfile?.cargo ?? null,
        dataEntrada: employeeProfile?.data_entrada ?? null,
        primaryTeamId: employeeProfile?.time_principal_id ?? null,
      },
      units: unitMemberships,
      teams: {
        all: availableTeams,
        memberships: teamMemberships,
      },
    });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao carregar colaborador.",
      toLoggableError(error)
    );
  }
}
