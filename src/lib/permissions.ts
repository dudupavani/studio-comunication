// src/lib/permissions.ts
import type { AuthContext } from "@/lib/auth-context";
import type { PlatformRole, OrgRole, UnitRole } from "@/lib/types/roles";

export type { PlatformRole, OrgRole, UnitRole };

export type AuthContextWithRoles = AuthContext;

// Constantes tipadas para comparações
const PLATFORM_ADMIN: PlatformRole = "platform_admin";
const ORG_ADMIN: OrgRole = "org_admin";
const ORG_MASTER: OrgRole = "org_master";
const UNIT_MASTER: UnitRole = "unit_master";

/** Helpers básicos */
export const isPlatformAdmin = (ctx?: AuthContext | null) =>
  !!ctx && ctx.platformRole === PLATFORM_ADMIN;

export const isOrgAdmin = (auth?: AuthContext | null) =>
  !!auth &&
  (auth.orgRole === ORG_ADMIN || auth.orgRole === ORG_MASTER);

// Compatibilidade: mantém a função, mas delega para isOrgAdmin
export const isOrgAdminEffective = (auth?: AuthContext | null) =>
  isOrgAdmin(auth);

/** Verifica se é org_admin da organização específica */
export const isOrgAdminOf = (ctx: AuthContext | null, orgId?: string | null) =>
  !!ctx &&
  !!orgId &&
  ctx.orgId === orgId &&
  (ctx.orgRole === ORG_ADMIN || ctx.orgRole === ORG_MASTER);

/** Verifica se o usuário é unit_master (papel no membership da org) */
export const isUnitMaster = (ctx?: AuthContext | null) =>
  !!ctx && ctx.orgRole === UNIT_MASTER;

/**
 * Verifica se o usuário é unit_master DA unidade específica:
 * - precisa ter papel unit_master (membership)
 * - e estar vinculado à unidade (membership)
 */
export const isUnitMasterOf = (
  ctx: AuthContext | null,
  unitId?: string | null
) => !!ctx && !!unitId && isUnitMaster(ctx) && ctx.unitIds.includes(unitId);

/** Apenas vínculo à unidade (sem checar papel) */
export const belongsToUnit = (
  ctx: AuthContext | null,
  unitId?: string | null
) => !!ctx && !!unitId && ctx.unitIds.includes(unitId);

/** Matriz de permissão resumida */
export const permissions = {
  // Organizações
  canCreateOrg: (ctx: AuthContext | null) => isPlatformAdmin(ctx),

  canManageOrg: (ctx: AuthContext | null, orgId: string) =>
    isPlatformAdmin(ctx) || isOrgAdminOf(ctx, orgId),

  // Unidades
  canCreateUnit: (ctx: AuthContext | null, orgId: string) =>
    isPlatformAdmin(ctx) || isOrgAdminOf(ctx, orgId),

  canManageUnit: (ctx: AuthContext | null, orgId: string) =>
    isPlatformAdmin(ctx) || isOrgAdminOf(ctx, orgId),

  // Usuários da organização
  canManageOrgUsers: (ctx: AuthContext | null, orgId: string) =>
    isPlatformAdmin(ctx) || isOrgAdminOf(ctx, orgId),

  // Usuários da unidade
  // ⚠️ Agora somente unit_master (papel) com vínculo à unidade tem essa permissão
  canManageUnitUsers: (ctx: AuthContext | null, unitId: string) =>
    isPlatformAdmin(ctx) || isOrgAdmin(ctx) || isUnitMasterOf(ctx, unitId),

  // Conteúdos da unidade
  canViewUnitContent: (ctx: AuthContext | null, unitId: string) =>
    isPlatformAdmin(ctx) || isOrgAdmin(ctx) || belongsToUnit(ctx, unitId),
};
