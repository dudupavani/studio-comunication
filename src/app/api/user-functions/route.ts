import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth-context";
import {
  DEFAULT_ORG_MASTER_PERMISSIONS,
  assertKnownPermissionKeys,
  canActorManageFunctionBaseRole,
  canUsePermission,
  isUserFunctionBaseRole,
  normalizePermissionKeys,
  type UserFunctionBaseRole,
} from "@/lib/permissions/user-functions";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  baseRole: z.enum(["org_master", "unit_master", "unit_user"]),
  permissions: z.array(z.string()).optional(),
});

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

async function authorizeList() {
  const auth = await getAuthContext();
  if (!auth) return { error: jsonError(401, "E preciso estar autenticado.") };
  if (!auth.orgId) return { error: jsonError(400, "Organizacao ativa nao encontrada.") };

  const canAccess =
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    (await canUsePermission(auth, "manage_user_functions"));

  if (!canAccess) {
    return { error: jsonError(403, "Sem permissao para acessar funcoes de usuarios.") };
  }

  return { auth, orgId: auth.orgId };
}

function defaultPermissionsForBaseRole(baseRole: UserFunctionBaseRole) {
  if (baseRole === "org_master") return DEFAULT_ORG_MASTER_PERMISSIONS;
  return [];
}

export async function GET() {
  try {
    const scope = await authorizeList();
    if ("error" in scope) return scope.error;
    const { auth, orgId } = scope;

    const svc = createServiceClient();
    const [profilesRes, permissionsRes, assignmentsRes, usersRes] =
      await Promise.all([
        svc
          .from("user_permission_profiles")
          .select("id, org_id, name, base_role, created_at, updated_at")
          .eq("org_id", orgId)
          .order("name", { ascending: true }),
        svc
          .from("user_permission_profile_permissions")
          .select("profile_id, permission_key"),
        svc
          .from("user_permission_profile_assignments")
          .select("id, org_id, user_id, profile_id, assigned_at")
          .eq("org_id", orgId),
        svc
          .from("org_members")
          .select(
            `
            user_id,
            role,
            profiles:profiles!org_members_user_id_fkey (
              id,
              full_name,
              avatar_url,
              global_role
            )
          `
          )
          .eq("org_id", orgId)
          .in("role", ["org_master", "unit_master", "unit_user"]),
      ]);

    if (profilesRes.error) {
      return jsonError(500, "Erro ao listar funcoes.", toLoggableError(profilesRes.error));
    }
    if (permissionsRes.error) {
      return jsonError(500, "Erro ao listar permissoes.", toLoggableError(permissionsRes.error));
    }
    if (assignmentsRes.error) {
      return jsonError(500, "Erro ao listar atribuicoes.", toLoggableError(assignmentsRes.error));
    }
    if (usersRes.error) {
      return jsonError(500, "Erro ao listar usuarios elegiveis.", toLoggableError(usersRes.error));
    }

    const permissionsByProfile = new Map<string, string[]>();
    (permissionsRes.data ?? []).forEach((row) => {
      if (!permissionsByProfile.has(row.profile_id)) {
        permissionsByProfile.set(row.profile_id, []);
      }
      permissionsByProfile.get(row.profile_id)?.push(row.permission_key);
    });

    const assignmentsByProfile = new Map<string, string[]>();
    const assignmentByUser = new Map<string, string>();
    (assignmentsRes.data ?? []).forEach((row) => {
      if (!assignmentsByProfile.has(row.profile_id)) {
        assignmentsByProfile.set(row.profile_id, []);
      }
      assignmentsByProfile.get(row.profile_id)?.push(row.user_id);
      assignmentByUser.set(row.user_id, row.profile_id);
    });

    const allowedBaseRoles = (["org_master", "unit_master", "unit_user"] as const).filter(
      (role) => canActorManageFunctionBaseRole(auth, role)
    );

    return NextResponse.json({
      ok: true,
      allowedBaseRoles,
      profiles:
        profilesRes.data?.map((profile) => ({
          id: profile.id,
          name: profile.name,
          baseRole: profile.base_role,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          permissions: normalizePermissionKeys(
            permissionsByProfile.get(profile.id) ?? []
          ),
          userIds: assignmentsByProfile.get(profile.id) ?? [],
        })) ?? [],
      users:
        usersRes.data?.map((row: any) => ({
          id: row.user_id as string,
          role: row.role as string,
          name: row.profiles?.full_name ?? "Sem nome",
          avatarUrl: row.profiles?.avatar_url ?? null,
          globalRole: row.profiles?.global_role ?? null,
          assignedProfileId: assignmentByUser.get(row.user_id as string) ?? null,
        })) ?? [],
    });
  } catch (error) {
    return jsonError(500, "Erro inesperado ao carregar funcoes.", toLoggableError(error));
  }
}

export async function POST(req: Request) {
  try {
    const scope = await authorizeList();
    if ("error" in scope) return scope.error;
    const { auth, orgId } = scope;

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError(400, "Dados invalidos.", parsed.error.flatten());
    }

    const baseRole = parsed.data.baseRole;
    if (!isUserFunctionBaseRole(baseRole)) {
      return jsonError(400, "Role base invalida.");
    }
    if (!canActorManageFunctionBaseRole(auth, baseRole)) {
      return jsonError(403, "Sem permissao para gerenciar funcoes deste role.");
    }

    const rawPermissions =
      parsed.data.permissions ?? defaultPermissionsForBaseRole(baseRole);
    assertKnownPermissionKeys(rawPermissions);
    const permissions = normalizePermissionKeys(rawPermissions);

    const svc = createServiceClient();
    const { data: inserted, error: insertError } = await svc
      .from("user_permission_profiles")
      .insert({
        org_id: orgId,
        name: parsed.data.name.trim(),
        base_role: baseRole,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select("id, name, base_role, created_at, updated_at")
      .maybeSingle();

    if (insertError || !inserted) {
      if (insertError?.code === "23505") {
        return jsonError(409, "Ja existe uma funcao com este nome.");
      }
      return jsonError(500, "Erro ao criar funcao.", toLoggableError(insertError));
    }

    if (permissions.length > 0) {
      const { error: permissionsError } = await svc
        .from("user_permission_profile_permissions")
        .insert(
          permissions.map((permissionKey) => ({
            profile_id: inserted.id,
            permission_key: permissionKey,
          }))
        );

      if (permissionsError) {
        await svc.from("user_permission_profiles").delete().eq("id", inserted.id);
        return jsonError(500, "Erro ao salvar permissoes.", toLoggableError(permissionsError));
      }
    }

    return NextResponse.json(
      {
        ok: true,
        profile: {
          id: inserted.id,
          name: inserted.name,
          baseRole: inserted.base_role,
          permissions,
          userIds: [],
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(500, "Erro inesperado ao criar funcao.", toLoggableError(error));
  }
}
