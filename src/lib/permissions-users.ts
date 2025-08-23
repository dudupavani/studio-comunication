// src/lib/permissions-users.ts
// Verifica se o usuário pode gerenciar usuários (rota /users).
// Regra: platform_admin OU org_admin.

import type { AuthContext } from "@/lib/auth-context";
import { isPlatformAdmin, isOrgAdmin } from "@/lib/permissions";

/**
 * Retorna true se o usuário puder gerenciar usuários.
 * - platform_admin: true
 * - org_admin: true
 * - demais: false
 */
export function canManageUsers(auth?: AuthContext | null): boolean {
  return !!auth && (isPlatformAdmin(auth) || isOrgAdmin(auth));
}
