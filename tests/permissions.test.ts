import {
  belongsToUnit,
  isOrgAdmin,
  isOrgAdminOf,
  isPlatformAdmin,
  isUnitMaster,
  isUnitMasterOf,
  permissions,
} from "../src/lib/permissions";
import type { AuthContext } from "../src/lib/auth-context";

const baseContext: AuthContext = {
  userId: "user-1",
  platformRole: null,
  orgRole: null,
  orgId: "org-1",
  unitIds: [],
};

const makeContext = (overrides: Partial<AuthContext>): AuthContext => ({
  ...baseContext,
  ...overrides,
});

describe("permissions", () => {
  it("isPlatformAdmin only accepts platform_admin role", () => {
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(makeContext({ platformRole: null }))).toBe(false);
    expect(
      isPlatformAdmin(makeContext({ platformRole: "platform_admin" }))
    ).toBe(true);
  });

  it("isOrgAdmin and isOrgAdminOf detect org admin role for the expected org", () => {
    const ctx = makeContext({ orgRole: "org_admin" });
    expect(isOrgAdmin(ctx)).toBe(true);
    expect(isOrgAdminOf(ctx, "org-1")).toBe(true);
    expect(isOrgAdminOf(ctx, "other-org")).toBe(false);
  });

  it("isUnitMaster and isUnitMasterOf require both role and membership", () => {
    const candidate = makeContext({
      orgRole: "unit_master",
      unitIds: ["unit-1", "unit-2"],
    });
    expect(isUnitMaster(candidate)).toBe(true);
    expect(isUnitMasterOf(candidate, "unit-1")).toBe(true);
    expect(isUnitMasterOf(candidate, "unit-3")).toBe(false);
  });

  it("belongsToUnit is true only when the unit is in the membership list", () => {
    const ctx = makeContext({ unitIds: ["unit-a"] });
    expect(belongsToUnit(ctx, "unit-a")).toBe(true);
    expect(belongsToUnit(ctx, "unit-b")).toBe(false);
  });

  it("permissions.canManageOrgUsers allows platform admin or matching org admin", () => {
    const platform = makeContext({ platformRole: "platform_admin" });
    const orgAdmin = makeContext({ orgRole: "org_admin" });
    const outsider = makeContext({ orgRole: "unit_master" });

    expect(permissions.canManageOrgUsers(platform, "org-1")).toBe(true);
    expect(permissions.canManageOrgUsers(orgAdmin, "org-1")).toBe(true);
    expect(permissions.canManageOrgUsers(orgAdmin, "org-2")).toBe(false);
    expect(permissions.canManageOrgUsers(outsider, "org-1")).toBe(false);
  });

  it("permissions.canManageUnitUsers permits platform/org admins or unit masters of that unit", () => {
    const platform = makeContext({ platformRole: "platform_admin" });
    const orgAdmin = makeContext({ orgRole: "org_admin" });
    const unitMaster = makeContext({
      orgRole: "unit_master",
      unitIds: ["unit-1"],
    });
    const member = makeContext({ unitIds: ["unit-1"], orgRole: "unit_user" });

    expect(permissions.canManageUnitUsers(platform, "unit-1")).toBe(true);
    expect(permissions.canManageUnitUsers(orgAdmin, "unit-1")).toBe(true);
    expect(permissions.canManageUnitUsers(unitMaster, "unit-1")).toBe(true);
    expect(permissions.canManageUnitUsers(unitMaster, "unit-2")).toBe(false);
    expect(permissions.canManageUnitUsers(member, "unit-1")).toBe(false);
  });

  it("permissions.canViewUnitContent requires membership or elevated roles", () => {
    const platform = makeContext({ platformRole: "platform_admin" });
    const orgAdmin = makeContext({ orgRole: "org_admin" });
    const unitMember = makeContext({ unitIds: ["unit-1"] });
    const outsider = makeContext({ unitIds: [] });

    expect(permissions.canViewUnitContent(platform, "unit-1")).toBe(true);
    expect(permissions.canViewUnitContent(orgAdmin, "unit-1")).toBe(true);
    expect(permissions.canViewUnitContent(unitMember, "unit-1")).toBe(true);
    expect(permissions.canViewUnitContent(outsider, "unit-1")).toBe(false);
  });
});
