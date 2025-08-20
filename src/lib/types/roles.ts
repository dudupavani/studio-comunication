// src/lib/types/roles.ts
export const PLATFORM_ROLES = ["platform_admin"] as const;
export const PLATFORM_ADMIN: PlatformRole = "platform_admin";

export const ORG_ROLES = ["org_admin", "org_master"] as const;
export const ORG_ADMIN: OrgRole = "org_admin";
export const ORG_MASTER: OrgRole = "org_master";

export const UNIT_ROLES = ["unit_master", "unit_user"] as const;
export const UNIT_MASTER: UnitRole = "unit_master";
export const UNIT_USER: UnitRole = "unit_user";

export const APP_ROLES = [
  ...PLATFORM_ROLES,
  ...ORG_ROLES,
  ...UNIT_ROLES,
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number]; // "platform_admin"
export type OrgRole = (typeof ORG_ROLES)[number];           // "org_admin" | "org_master"
export type UnitRole = (typeof UNIT_ROLES)[number];         // "unit_master" | "unit_user"
export type AppRole = (typeof APP_ROLES)[number];

// Helpers de validação tipados (opcionalmente úteis):
export const isPlatformRole = (r: string): r is PlatformRole =>
  (PLATFORM_ROLES as readonly string[]).includes(r);
export const isOrgRole = (r: string): r is OrgRole =>
  (ORG_ROLES as readonly string[]).includes(r);
export const isUnitRole = (r: string): r is UnitRole =>
  (UNIT_ROLES as readonly string[]).includes(r);
