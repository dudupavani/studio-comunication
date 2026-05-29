import type { AuthContext } from "@/lib/auth-context";

/**
 * Retorna true se o usuário puder gerenciar membros de uma unidade específica.
 * - platform_admin: true (qualquer unidade)
 * - org_admin / org_master: true (qualquer unidade da org)
 * - unit_master: true apenas para unidades em auth.unitIds
 * - unit_user: false
 */
export function canManageUnit(auth: AuthContext, unitId: string): boolean {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    auth.orgRole === "org_master" ||
    (auth.orgRole === "unit_master" && auth.unitIds.includes(unitId))
  );
}
