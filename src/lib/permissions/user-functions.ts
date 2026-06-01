import type { AuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";
import type { AppRole } from "@/lib/types/roles";

export const USER_FUNCTION_PERMISSION_KEYS = [
  "manage_users",
  "manage_units",
  "manage_teams",
  "manage_communities",
  "manage_user_functions",
] as const;

export type UserFunctionPermissionKey =
  (typeof USER_FUNCTION_PERMISSION_KEYS)[number];

export const USER_FUNCTION_BASE_ROLES = [
  "org_master",
  "unit_master",
  "unit_user",
] as const;

export type UserFunctionBaseRole = (typeof USER_FUNCTION_BASE_ROLES)[number];

export const USER_FUNCTION_PERMISSION_CATALOG: Array<{
  key: UserFunctionPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: "manage_users",
    label: "Gerenciar usuarios",
    description:
      "Acessar usuarios, convidar, editar dados permitidos, alterar roles permitidos e remover usuarios permitidos.",
  },
  {
    key: "manage_units",
    label: "Gerenciar unidades",
    description:
      "Acessar unidades, criar, editar, excluir e gerenciar membros de unidades.",
  },
  {
    key: "manage_teams",
    label: "Gerenciar equipes",
    description:
      "Acessar equipes, criar, editar, excluir e gerenciar membros e lideres.",
  },
  {
    key: "manage_communities",
    label: "Gerenciar comunidades",
    description:
      "Acessar comunidades como gestor, criar, editar, excluir, segmentar e publicar como gestor.",
  },
  {
    key: "manage_user_functions",
    label: "Gerenciar funcoes de usuarios",
    description:
      "Acessar Funcoes de usuarios e gerenciar funcoes dentro do escopo permitido.",
  },
];

export const DEFAULT_ORG_MASTER_PERMISSIONS: UserFunctionPermissionKey[] = [
  ...USER_FUNCTION_PERMISSION_KEYS,
];

const PERMISSION_SET = new Set<string>(USER_FUNCTION_PERMISSION_KEYS);
const BASE_ROLE_SET = new Set<string>(USER_FUNCTION_BASE_ROLES);

export function isUserFunctionPermissionKey(
  value: string
): value is UserFunctionPermissionKey {
  return PERMISSION_SET.has(value);
}

export function isUserFunctionBaseRole(
  value: string
): value is UserFunctionBaseRole {
  return BASE_ROLE_SET.has(value);
}

export function normalizePermissionKeys(
  values: string[]
): UserFunctionPermissionKey[] {
  const unique = Array.from(new Set(values));
  return unique.filter(isUserFunctionPermissionKey);
}

export function assertKnownPermissionKeys(values: string[]) {
  const unknown = Array.from(new Set(values)).filter(
    (value) => !isUserFunctionPermissionKey(value)
  );
  if (unknown.length > 0) {
    throw new Error(`Permissoes desconhecidas: ${unknown.join(", ")}`);
  }
}

export function defaultPermissionsForRole(
  role: AppRole | null | undefined
): UserFunctionPermissionKey[] {
  if (role === "org_master") return DEFAULT_ORG_MASTER_PERMISSIONS;
  return [];
}

export async function getEffectivePermissionKeys(
  auth: AuthContext | null | undefined
): Promise<UserFunctionPermissionKey[]> {
  if (!auth) return [];
  if (auth.platformRole === "platform_admin") {
    return DEFAULT_ORG_MASTER_PERMISSIONS;
  }
  if (auth.orgRole === "org_admin") {
    return DEFAULT_ORG_MASTER_PERMISSIONS;
  }
  if (!auth.orgId || !auth.orgRole) return [];

  const defaults = DEFAULT_ORG_MASTER_PERMISSIONS;
  if (!defaults.length) return [];

  const svc = createServiceClient();
  const { data: assignment, error: assignmentError } = await svc
    .from("user_permission_profile_assignments")
    .select("profile_id")
    .eq("org_id", auth.orgId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (assignmentError || !assignment?.profile_id) {
    return defaults;
  }

  const { data: profile, error: profileError } = await svc
    .from("user_permission_profiles")
    .select("id, base_role, org_id")
    .eq("id", assignment.profile_id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.org_id !== auth.orgId ||
    profile.base_role !== auth.orgRole
  ) {
    return defaults;
  }

  const { data: permissions, error: permissionsError } = await svc
    .from("user_permission_profile_permissions")
    .select("permission_key")
    .eq("profile_id", profile.id);

  if (permissionsError) return defaults;

  return normalizePermissionKeys(
    (permissions ?? []).map((row) => row.permission_key)
  );
}

export async function canUsePermission(
  auth: AuthContext | null | undefined,
  permissionKey: UserFunctionPermissionKey
): Promise<boolean> {
  if (!auth) return false;
  if (auth.platformRole === "platform_admin") return true;
  if (auth.orgRole === "org_admin") return true;

  const permissions = await getEffectivePermissionKeys(auth);
  return permissions.includes(permissionKey);
}

export function canActorManageFunctionBaseRole(
  auth: AuthContext | null | undefined,
  baseRole: UserFunctionBaseRole
): boolean {
  if (!auth) return false;
  if (auth.platformRole === "platform_admin") return true;
  if (auth.orgRole === "org_admin") return true;
  if (auth.orgRole === "org_master") {
    return baseRole === "unit_master" || baseRole === "unit_user";
  }
  return false;
}

export type ManageTargetUser = {
  userId: string;
  orgRole: AppRole | null;
  globalRole: string | null;
};

export function canManageTargetUser(
  auth: AuthContext | null | undefined,
  target: ManageTargetUser
): boolean {
  if (!auth) return false;
  if (target.globalRole === "platform_admin") {
    return auth.platformRole === "platform_admin";
  }
  if (auth.platformRole === "platform_admin") return true;
  if (auth.orgRole === "org_admin") return true;
  if (auth.orgRole !== "org_master") return false;
  if (target.orgRole === "org_admin") return false;
  return target.orgRole === "org_master" ||
    target.orgRole === "unit_master" ||
    target.orgRole === "unit_user";
}

export async function loadManageTargetUser(
  orgId: string,
  userId: string
): Promise<ManageTargetUser | null> {
  const svc = createServiceClient();
  const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] =
    await Promise.all([
      svc
        .from("org_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .maybeSingle(),
      svc.from("profiles").select("global_role").eq("id", userId).maybeSingle(),
    ]);

  if (membershipError || profileError || !membership) return null;

  return {
    userId,
    orgRole: membership.role,
    globalRole: profile?.global_role ?? null,
  };
}

export async function canManageTargetUserById(
  auth: AuthContext | null | undefined,
  targetUserId: string
): Promise<boolean> {
  if (!auth?.orgId) return false;
  const target = await loadManageTargetUser(auth.orgId, targetUserId);
  if (!target) return false;
  return canManageTargetUser(auth, target);
}

export async function assertCanManageTargetUserById(
  auth: AuthContext | null | undefined,
  targetUserId: string
) {
  const canManage = await canManageTargetUserById(auth, targetUserId);
  if (!canManage) {
    throw new Error("Sem permissao para gerenciar este usuario.");
  }
}

export type PermissionProfileRow =
  Database["public"]["Tables"]["user_permission_profiles"]["Row"];
