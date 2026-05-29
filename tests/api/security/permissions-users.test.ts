import { canManageUsers } from "@/lib/permissions-users";
import type { AuthContext } from "@/lib/auth-context";

const base: AuthContext = {
  userId: "user-1",
  platformRole: null,
  orgRole: null,
  orgId: "org-1",
  unitIds: [],
};

const make = (overrides: Partial<AuthContext>): AuthContext => ({
  ...base,
  ...overrides,
});

describe("canManageUsers", () => {
  it("returns false for null/undefined", () => {
    expect(canManageUsers(null)).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });

  it("returns true for platform_admin regardless of org role", () => {
    expect(canManageUsers(make({ platformRole: "platform_admin", orgRole: null }))).toBe(true);
    expect(canManageUsers(make({ platformRole: "platform_admin", orgRole: "unit_user" }))).toBe(true);
  });

  it("returns true for org_admin", () => {
    expect(canManageUsers(make({ orgRole: "org_admin" }))).toBe(true);
  });

  it("returns true for org_master", () => {
    expect(canManageUsers(make({ orgRole: "org_master" }))).toBe(true);
  });

  it("returns false for unit_master — manages unit members, not org users", () => {
    expect(canManageUsers(make({ orgRole: "unit_master", unitIds: ["unit-1"] }))).toBe(false);
  });

  it("returns false for unit_user", () => {
    expect(canManageUsers(make({ orgRole: "unit_user" }))).toBe(false);
  });

  it("returns false when no org role and not platform_admin", () => {
    expect(canManageUsers(make({ orgRole: null, platformRole: null }))).toBe(false);
  });
});
