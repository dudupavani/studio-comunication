// src/lib/permissions-users.ts
// Verifica se o usuário pode gerenciar usuários (rota /users).
// Regra: platform_admin OU org_admin/org_master.

import type { AuthContext } from "@/lib/auth-context";
import { isPlatformAdmin } from "@/lib/permissions";
import { canUsePermission } from "@/lib/permissions/user-functions";

/**
 * Retorna true se o usuário puder gerenciar usuários na organização.
 * - platform_admin: true
 * - org_admin: true
 * - org_master: true
 * - unit_master/unit_user: false (unit_master gerencia membros da sua unidade, não da org)
 */
export async function canManageUsers(auth?: AuthContext | null): Promise<boolean> {
  if (!auth) return false;

  const orgRole = auth.orgRole || null;
  const isOrgManager =
    orgRole === "org_admin" ||
    (orgRole === "org_master" && (await canUsePermission(auth, "manage_users")));

  return isPlatformAdmin(auth) || isOrgManager;
}
