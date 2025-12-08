import getGlobalAuthContext from "@/lib/auth-context";

export async function getAuthContext() {
  const ctx = await getGlobalAuthContext();
  if (!ctx) return null;

  return {
    userId: ctx.userId,
    orgId: ctx.orgId,
    role: ctx.orgRole,
    isPlatformAdmin: ctx.platformRole === "platform_admin",
    isOrgAdmin: ctx.orgRole === "org_admin" || ctx.orgRole === "org_master",
    isUnitMaster: ctx.orgRole === "unit_master",
    unitIds: ctx.unitIds,
  };
}

export default getAuthContext;
