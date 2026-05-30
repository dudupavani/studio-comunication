import type { AuthContext } from "@/lib/auth-context";
import { canUsePermission } from "@/lib/permissions/user-functions";

/**
 * Retorna true se o usuário puder gerenciar membros de uma unidade específica.
 * - platform_admin: true (qualquer unidade)
 * - org_admin / org_master: true (qualquer unidade da org)
 * - unit_master: true apenas para unidades em auth.unitIds
 * - unit_user: false
 */
export async function canManageUnit(auth: AuthContext, unitId: string): Promise<boolean> {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    (auth.orgRole === "org_master" &&
      (await canUsePermission(auth, "manage_units"))) ||
    (auth.orgRole === "unit_master" && auth.unitIds.includes(unitId))
  );
}
