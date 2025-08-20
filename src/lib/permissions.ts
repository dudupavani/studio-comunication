// src/lib/permissions.ts
import type { AuthContext } from "@/lib/auth-context";
import type { PlatformRole, OrgRole } from "@/lib/types/roles";

export type { PlatformRole, OrgRole };

export type AuthContextWithRoles = AuthContext;

// Constantes tipadas para comparações
const PLATFORM_ADMIN: PlatformRole = "platform_admin";
const ORG_ADMIN: OrgRole = "org_admin";

/** Helpers básicos */
export const isPlatformAdmin = (ctx?: AuthContext | null) =>
  !!ctx && ctx.platformRole === PLATFORM_ADMIN;

export function isOrgAdmin(auth: AuthContext | null) {
  return auth?.orgRole === "org_admin" || auth?.orgRoleEffective === "org_admin";
}

// considera tanto orgRoleEffective quanto orgRole (para compatibilidade)
export function isOrgAdminEffective(auth: AuthContext | null) {
  return auth?.orgRoleEffective === "org_admin" || auth?.orgRole === "org_admin";
}

export const isOrgAdminOf = (ctx: AuthContext | null, orgId?: string | null) =>
  !!ctx && !!orgId && ctx.orgRole === ORG_ADMIN && ctx.orgId === orgId;

export const isUnitMasterOf = (
  ctx: AuthContext | null,
  unitId?: string | null
) =>
  !!ctx &&
  !!unitId &&
  ctx.unitIds.includes(unitId!);
  // NOTE: Para verificar se o usuário é unit_master de uma unidade específica,
  // precisaríamos fazer uma chamada assíncrona ao banco, o que não é apropriado
  // para uma função de verificação síncrona. A verificação real deve ser feita
  // onde for necessário, usando getUserUnitRole.

export const belongsToUnit = (
  ctx: AuthContext | null,
  unitId?: string | null
) => !!ctx && !!unitId && ctx.unitIds.includes(unitId!);

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
  canManageUnitUsers: (ctx: AuthContext | null, unitId: string) =>
    isPlatformAdmin(ctx) ||
    ctx?.orgRole === ORG_ADMIN ||
    isUnitMasterOf(ctx, unitId),

  // Conteúdos da unidade
  canViewUnitContent: (ctx: AuthContext | null, unitId: string) =>
    isPlatformAdmin(ctx) ||
    ctx?.orgRole === ORG_ADMIN ||
    belongsToUnit(ctx, unitId),
};
