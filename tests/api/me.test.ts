import { GET } from "@/app/api/me/route";
import { getAuthContext } from "@/lib/auth-context";

jest.mock("@/lib/auth-context", () => ({ getAuthContext: jest.fn() }));

const mockedGetAuthContext = getAuthContext as jest.Mock;

const FULL_AUTH_CONTEXT = {
  userId: "user-111",
  platformRole: null,
  orgRole: "org_admin" as const,
  orgId: "org-222",
  unitIds: ["unit-333"],
  user: {
    id: "user-111",
    email: "admin@example.com",
    user_metadata: { invited_org_id: "org-secret", invited_role: "org_admin" },
    app_metadata: { provider: "email", internal_flag: true },
  },
};

beforeEach(() => jest.clearAllMocks());

describe("GET /api/me", () => {
  it("returns 401 when not authenticated", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns only the 5 allowed fields — no user object", async () => {
    mockedGetAuthContext.mockResolvedValue(FULL_AUTH_CONTEXT);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.data).toEqual({
      userId: "user-111",
      platformRole: null,
      orgRole: "org_admin",
      orgId: "org-222",
      unitIds: ["unit-333"],
    });
  });

  it("does not expose user_metadata or app_metadata", async () => {
    mockedGetAuthContext.mockResolvedValue(FULL_AUTH_CONTEXT);
    const res = await GET();
    const json = await res.json();

    expect(json.data).not.toHaveProperty("user");
    expect(json.data).not.toHaveProperty("user_metadata");
    expect(json.data).not.toHaveProperty("app_metadata");
    expect(JSON.stringify(json)).not.toContain("invited_org_id");
    expect(JSON.stringify(json)).not.toContain("internal_flag");
  });

  it("normalizes undefined orgId to null", async () => {
    mockedGetAuthContext.mockResolvedValue({
      ...FULL_AUTH_CONTEXT,
      orgId: undefined,
    });
    const res = await GET();
    const json = await res.json();
    expect(json.data.orgId).toBeNull();
  });

  it("returns correct shape for platform_admin without org", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "admin-user",
      platformRole: "platform_admin",
      orgRole: null,
      orgId: undefined,
      unitIds: [],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({
      userId: "admin-user",
      platformRole: "platform_admin",
      orgRole: null,
      orgId: null,
      unitIds: [],
    });
  });
});
