import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth-context";
import {
  canActorManageFunctionBaseRole,
  canUsePermission,
  isUserFunctionBaseRole,
} from "@/lib/permissions/user-functions";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({ userIds: z.array(z.string().uuid()) });

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function PUT(
  req: Request,
  context: RouteContext<"/api/user-functions/[id]/assignments">
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parametros invalidos.", parsedParams.error.flatten());
    }

    const auth = await getAuthContext();
    if (!auth) return jsonError(401, "E preciso estar autenticado.");
    if (!auth.orgId) return jsonError(400, "Organizacao ativa nao encontrada.");

    const canAccess =
      auth.platformRole === "platform_admin" ||
      auth.orgRole === "org_admin" ||
      (await canUsePermission(auth, "manage_user_functions"));
    if (!canAccess) {
      return jsonError(403, "Sem permissao para gerenciar funcoes.");
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError(400, "Dados invalidos.", parsed.error.flatten());
    }

    const profileId = parsedParams.data.id;
    const userIds = Array.from(new Set(parsed.data.userIds));
    const svc = createServiceClient();

    const { data: profile, error: profileError } = await svc
      .from("user_permission_profiles")
      .select("id, org_id, base_role")
      .eq("id", profileId)
      .maybeSingle();

    if (profileError) {
      return jsonError(500, "Erro ao validar funcao.", toLoggableError(profileError));
    }
    if (!profile || profile.org_id !== auth.orgId) {
      return jsonError(404, "Funcao nao encontrada.");
    }
    if (
      !isUserFunctionBaseRole(profile.base_role) ||
      !canActorManageFunctionBaseRole(auth, profile.base_role)
    ) {
      return jsonError(403, "Sem permissao para atribuir esta funcao.");
    }

    if (userIds.length > 0) {
      const [{ data: memberships, error: membershipsError }, { data: profiles, error: profilesError }] =
        await Promise.all([
          svc
            .from("org_members")
            .select("user_id, role")
            .eq("org_id", auth.orgId)
            .in("user_id", userIds),
          svc
            .from("profiles")
            .select("id, global_role")
            .in("id", userIds),
        ]);

      if (membershipsError) {
        return jsonError(500, "Erro ao validar usuarios.", toLoggableError(membershipsError));
      }
      if (profilesError) {
        return jsonError(500, "Erro ao validar perfis.", toLoggableError(profilesError));
      }

      const roleByUser = new Map(
        (memberships ?? []).map((row) => [row.user_id, row.role])
      );
      const globalRoleByUser = new Map(
        (profiles ?? []).map((row) => [row.id, row.global_role])
      );

      const invalidUser = userIds.find((userId) => {
        const role = roleByUser.get(userId);
        const globalRole = globalRoleByUser.get(userId);
        return (
          role !== profile.base_role ||
          role === "org_admin" ||
          globalRole === "platform_admin"
        );
      });

      if (invalidUser) {
        return jsonError(
          400,
          "Todos os usuarios atribuidos precisam pertencer a organizacao e ter o mesmo role tecnico da funcao."
        );
      }
    }

    const { error: deleteError } = await svc
      .from("user_permission_profile_assignments")
      .delete()
      .eq("profile_id", profileId)
      .eq("org_id", auth.orgId);

    if (deleteError) {
      return jsonError(500, "Erro ao substituir atribuicoes.", toLoggableError(deleteError));
    }

    if (userIds.length > 0) {
      const { error: insertError } = await svc
        .from("user_permission_profile_assignments")
        .upsert(
          userIds.map((userId) => ({
            org_id: auth.orgId!,
            user_id: userId,
            profile_id: profileId,
            assigned_by: auth.userId,
            assigned_at: new Date().toISOString(),
          })),
          { onConflict: "org_id,user_id" }
        );

      if (insertError) {
        return jsonError(500, "Erro ao salvar atribuicoes.", toLoggableError(insertError));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Erro inesperado ao atribuir funcao.", toLoggableError(error));
  }
}
