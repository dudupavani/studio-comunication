import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth-context";
import {
  assertKnownPermissionKeys,
  canActorManageFunctionBaseRole,
  canUsePermission,
  isUserFunctionBaseRole,
  normalizePermissionKeys,
} from "@/lib/permissions/user-functions";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const ParamsSchema = z.object({ id: z.string().uuid() });
const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  permissions: z.array(z.string()).optional(),
});

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

async function getAuthorizedProfile(profileId: string) {
  const auth = await getAuthContext();
  if (!auth) return { error: jsonError(401, "E preciso estar autenticado.") };
  if (!auth.orgId) return { error: jsonError(400, "Organizacao ativa nao encontrada.") };

  const canAccess =
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    (await canUsePermission(auth, "manage_user_functions"));
  if (!canAccess) {
    return { error: jsonError(403, "Sem permissao para gerenciar funcoes.") };
  }

  const svc = createServiceClient();
  const { data: profile, error: profileError } = await svc
    .from("user_permission_profiles")
    .select("id, org_id, base_role")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    return { error: jsonError(500, "Erro ao validar funcao.", toLoggableError(profileError)) };
  }
  if (!profile || profile.org_id !== auth.orgId) {
    return { error: jsonError(404, "Funcao nao encontrada.") };
  }
  if (
    !isUserFunctionBaseRole(profile.base_role) ||
    !canActorManageFunctionBaseRole(auth, profile.base_role)
  ) {
    return { error: jsonError(403, "Sem permissao para gerenciar funcoes deste role.") };
  }

  return { auth, profile, svc };
}

export async function PATCH(
  req: Request,
  context: RouteContext<"/api/user-functions/[id]">
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parametros invalidos.", parsedParams.error.flatten());
    }

    const scope = await getAuthorizedProfile(parsedParams.data.id);
    if ("error" in scope) return scope.error;
    const { auth, profile, svc } = scope;

    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError(400, "Dados invalidos.", parsed.error.flatten());
    }

    if (parsed.data.name !== undefined) {
      const { error: updateError } = await svc
        .from("user_permission_profiles")
        .update({
          name: parsed.data.name.trim(),
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        if (updateError.code === "23505") {
          return jsonError(409, "Ja existe uma funcao com este nome.");
        }
        return jsonError(500, "Erro ao atualizar funcao.", toLoggableError(updateError));
      }
    }

    if (parsed.data.permissions !== undefined) {
      assertKnownPermissionKeys(parsed.data.permissions);
      const permissions = normalizePermissionKeys(parsed.data.permissions);
      const { error: deleteError } = await svc
        .from("user_permission_profile_permissions")
        .delete()
        .eq("profile_id", profile.id);

      if (deleteError) {
        return jsonError(500, "Erro ao substituir permissoes.", toLoggableError(deleteError));
      }

      if (permissions.length > 0) {
        const { error: insertError } = await svc
          .from("user_permission_profile_permissions")
          .insert(
            permissions.map((permissionKey) => ({
              profile_id: profile.id,
              permission_key: permissionKey,
            }))
          );

        if (insertError) {
          return jsonError(500, "Erro ao salvar permissoes.", toLoggableError(insertError));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Erro inesperado ao atualizar funcao.", toLoggableError(error));
  }
}

export async function DELETE(
  _req: Request,
  context: RouteContext<"/api/user-functions/[id]">
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(400, "Parametros invalidos.", parsedParams.error.flatten());
    }

    const scope = await getAuthorizedProfile(parsedParams.data.id);
    if ("error" in scope) return scope.error;
    const { profile, svc } = scope;

    const { error: deleteError } = await svc
      .from("user_permission_profiles")
      .delete()
      .eq("id", profile.id);

    if (deleteError) {
      return jsonError(500, "Erro ao excluir funcao.", toLoggableError(deleteError));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(500, "Erro inesperado ao excluir funcao.", toLoggableError(error));
  }
}
