// src/lib/permissions.ts
export type PlatformRole = "platform_admin" | null;
export type OrgRole = "org_admin" | "unit_master" | "unit_user" | null;

export type AuthContext = {
  userId: string;
  platformRole: PlatformRole;
  orgRole: OrgRole;
  orgId: string | null;
  unitIds: string[];
};

/** Helpers básicos */
export const isPlatformAdmin = (ctx?: AuthContext | null) =>
  !!ctx && ctx.platformRole === "platform_admin";

export const isOrgAdminOf = (ctx: AuthContext | null, orgId?: string | null) =>
  !!ctx && !!orgId && ctx.orgRole === "org_admin" && ctx.orgId === orgId;

export const isUnitMasterOf = (
  ctx: AuthContext | null,
  unitId?: string | null
) =>
  !!ctx &&
  !!unitId &&
  ctx.orgRole === "unit_master" &&
  ctx.unitIds.includes(unitId!);

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
    ctx?.orgRole === "org_admin" ||
    isUnitMasterOf(ctx, unitId),

  // Conteúdos da unidade
  canViewUnitContent: (ctx: AuthContext | null, unitId: string) =>
    isPlatformAdmin(ctx) ||
    ctx?.orgRole === "org_admin" ||
    belongsToUnit(ctx, unitId),
};
