// src/lib/types/roles.ts
export const APP_ROLES = ["org_admin", "unit_master", "unit_user"] as const;
export type AppRole = (typeof APP_ROLES)[number];
