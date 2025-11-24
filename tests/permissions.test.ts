import assert from "node:assert/strict";
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
import { test } from "./utils/test-harness";

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

test("isPlatformAdmin only accepts platform_admin role", () => {
  assert.equal(isPlatformAdmin(null), false);
  assert.equal(isPlatformAdmin(makeContext({ platformRole: null })), false);
  assert.equal(
    isPlatformAdmin(makeContext({ platformRole: "platform_admin" })),
    true
  );
});

test("isOrgAdmin and isOrgAdminOf detect org admin role for the expected org", () => {
  const ctx = makeContext({ orgRole: "org_admin" });
  assert.equal(isOrgAdmin(ctx), true);
  assert.equal(isOrgAdminOf(ctx, "org-1"), true);
  assert.equal(isOrgAdminOf(ctx, "other-org"), false);
});

test("isUnitMaster and isUnitMasterOf require both role and membership", () => {
  const candidate = makeContext({
    orgRole: "unit_master",
    unitIds: ["unit-1", "unit-2"],
  });
  assert.equal(isUnitMaster(candidate), true);
  assert.equal(isUnitMasterOf(candidate, "unit-1"), true);
  assert.equal(isUnitMasterOf(candidate, "unit-3"), false);
});

test("belongsToUnit is true only when the unit is in the membership list", () => {
  const ctx = makeContext({ unitIds: ["unit-a"] });
  assert.equal(belongsToUnit(ctx, "unit-a"), true);
  assert.equal(belongsToUnit(ctx, "unit-b"), false);
});

test("permissions.canManageOrgUsers allows platform admin or matching org admin", () => {
  const platform = makeContext({ platformRole: "platform_admin" });
  const orgAdmin = makeContext({ orgRole: "org_admin" });
  const outsider = makeContext({ orgRole: "unit_master" });

  assert.equal(permissions.canManageOrgUsers(platform, "org-1"), true);
  assert.equal(permissions.canManageOrgUsers(orgAdmin, "org-1"), true);
  assert.equal(permissions.canManageOrgUsers(orgAdmin, "org-2"), false);
  assert.equal(permissions.canManageOrgUsers(outsider, "org-1"), false);
});

test("permissions.canManageUnitUsers permits platform/org admins or unit masters of that unit", () => {
  const platform = makeContext({ platformRole: "platform_admin" });
  const orgAdmin = makeContext({ orgRole: "org_admin" });
  const unitMaster = makeContext({
    orgRole: "unit_master",
    unitIds: ["unit-1"],
  });
  const member = makeContext({ unitIds: ["unit-1"], orgRole: "unit_user" });

  assert.equal(permissions.canManageUnitUsers(platform, "unit-1"), true);
  assert.equal(permissions.canManageUnitUsers(orgAdmin, "unit-1"), true);
  assert.equal(permissions.canManageUnitUsers(unitMaster, "unit-1"), true);
  assert.equal(permissions.canManageUnitUsers(unitMaster, "unit-2"), false);
  assert.equal(permissions.canManageUnitUsers(member, "unit-1"), false);
});

test("permissions.canViewUnitContent requires membership or elevated roles", () => {
  const platform = makeContext({ platformRole: "platform_admin" });
  const orgAdmin = makeContext({ orgRole: "org_admin" });
  const unitMember = makeContext({ unitIds: ["unit-1"] });
  const outsider = makeContext({ unitIds: [] });

  assert.equal(permissions.canViewUnitContent(platform, "unit-1"), true);
  assert.equal(permissions.canViewUnitContent(orgAdmin, "unit-1"), true);
  assert.equal(permissions.canViewUnitContent(unitMember, "unit-1"), true);
  assert.equal(permissions.canViewUnitContent(outsider, "unit-1"), false);
});
