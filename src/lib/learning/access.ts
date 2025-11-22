// src/lib/learning/access.ts
import { permissions, isOrgAdmin, isUnitMaster } from "@/lib/permissions";
import type { AuthContext } from "@/lib/auth-context";

export function canManageCourse(auth: AuthContext | null, orgId: string, unitId?: string | null) {
  if (!auth) return false;
  if (permissions.canManageOrg(auth, orgId)) return true;
  if (isUnitMaster(auth) && unitId && auth.unitIds.includes(unitId)) return true;
  return false;
}

export function canViewCourse(auth: AuthContext | null, orgId: string, unitId?: string | null) {
  if (!auth) return false;
  // org members can view published content; admins/unit masters can view drafts
  const isOrgMember = auth.orgId === orgId;
  const unitAllowed = !unitId || auth.unitIds.includes(unitId) || isOrgAdmin(auth);
  return isOrgMember && unitAllowed;
}
