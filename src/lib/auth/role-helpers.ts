// src/lib/auth/role-helpers.ts
import type { OrgRole, UnitRole } from "@/lib/types/roles";
import { PLATFORM_ADMIN, ORG_ADMIN, ORG_MASTER, UNIT_MASTER, UNIT_USER } from "@/lib/types/roles";

/**
 * Verifica se o usuário é platform_admin
 */
export function isPlatformAdmin(role: string | null): boolean {
  return role === PLATFORM_ADMIN;
}

/**
 * Verifica se o usuário é org_admin
 */
export function isOrgAdmin(role: OrgRole | null): boolean {
  return role === ORG_ADMIN;
}

/**
 * Verifica se o usuário é unit_master
 */
export function isUnitMaster(role: UnitRole | null): boolean {
  return role === UNIT_MASTER;
}

/**
 * Verifica se o usuário é org_master
 */
export function isOrgMaster(role: OrgRole | null): boolean {
  return role === ORG_MASTER;
}

/**
 * Verifica se o usuário é unit_user
 */
export function isUnitUser(role: UnitRole | null): boolean {
  return role === UNIT_USER;
}

/**
 * Verifica se o usuário tem permissão de admin na organização
 * (org_admin tem mais permissões que org_master)
 */
export function canManageOrg(role: OrgRole | null): boolean {
  return role === ORG_ADMIN || role === ORG_MASTER;
}

/**
 * Verifica se o usuário tem permissão de admin na unidade
 * (unit_master é o admin da unidade)
 */
export function canManageUnit(role: OrgRole | null, unitRole: UnitRole | null): boolean {
  return role === ORG_ADMIN || role === ORG_MASTER || unitRole === UNIT_MASTER;
}

/**
 * Verifica se o usuário pode visualizar conteúdo da unidade
 */
export function canViewUnitContent(role: OrgRole | null, unitRole: UnitRole | null): boolean {
  return role === ORG_ADMIN || role === ORG_MASTER || unitRole === UNIT_MASTER || unitRole === UNIT_USER;
}