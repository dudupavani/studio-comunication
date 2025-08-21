// src/lib/permissions-users.ts
import type { AuthContext } from "@/lib/auth-context";
import { isPlatformAdmin, isOrgAdmin } from "@/lib/permissions";

/**
 * Verifica se o usuário pode gerenciar usuários
 * Permite acesso a platform_admin e org_admin
 */
export function canManageUsers(auth: AuthContext | null): boolean {
  if (!auth) return false;
  
  return isPlatformAdmin(auth) || isOrgAdmin(auth);
}