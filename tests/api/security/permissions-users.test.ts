import { canManageUsers } from "@/lib/permissions-users";
import type { AuthContext } from "@/lib/auth-context";

jest.mock("@/lib/permissions/user-functions", () => ({
  canUsePermission: jest.fn().mockResolvedValue(true),
}));

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
  it("returns false for null/undefined", async () => {
    expect(await canManageUsers(null)).toBe(false);
    expect(await canManageUsers(undefined)).toBe(false);
  });

  it("returns true for platform_admin regardless of org role", async () => {
    expect(await canManageUsers(make({ platformRole: "platform_admin", orgRole: null }))).toBe(true);
    expect(await canManageUsers(make({ platformRole: "platform_admin", orgRole: "unit_user" }))).toBe(true);
  });

  it("returns true for org_admin", async () => {
    expect(await canManageUsers(make({ orgRole: "org_admin" }))).toBe(true);
  });

  it("returns true for org_master", async () => {
    expect(await canManageUsers(make({ orgRole: "org_master" }))).toBe(true);
  });

  it("returns false for unit_master — manages unit members, not org users", async () => {
    expect(await canManageUsers(make({ orgRole: "unit_master", unitIds: ["unit-1"] }))).toBe(false);
  });

  it("returns false for unit_user", async () => {
    expect(await canManageUsers(make({ orgRole: "unit_user" }))).toBe(false);
  });

  it("returns false when no org role and not platform_admin", async () => {
    expect(await canManageUsers(make({ orgRole: null, platformRole: null }))).toBe(false);
  });
});
