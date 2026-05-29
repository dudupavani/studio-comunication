import { NextRequest } from "next/server";
import { GET } from "@/app/api/groups/[groupId]/available-members/route";
import { getAuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveIdentityMap } from "@/lib/identity";

jest.mock("@/lib/auth-context", () => ({ getAuthContext: jest.fn() }));
jest.mock("@/lib/supabase/service", () => ({ createServiceClient: jest.fn() }));
jest.mock("@/lib/identity", () => ({ resolveIdentityMap: jest.fn() }));

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCreateServiceClient = createServiceClient as jest.Mock;
const mockedResolveIdentityMap = resolveIdentityMap as jest.Mock;

const ORG_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_ORG_ID = "aaaaaaaa-0000-0000-0000-000000000099";
const GROUP_ID = "bbbbbbbb-0000-0000-0000-000000000002";

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/groups/${GROUP_ID}/available-members`);
}

function makeCtx(groupId = GROUP_ID) {
  return { params: Promise.resolve({ groupId }) };
}

function makeSupabase(opts: {
  groupOrgId?: string;
  groupErr?: object | null;
  groupNull?: boolean;
} = {}) {
  const { groupOrgId = ORG_ID, groupErr = null, groupNull = false } = opts;

  const chain: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: groupNull ? null : { id: GROUP_ID, org_id: groupOrgId },
      error: groupErr ?? null,
    }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedResolveIdentityMap.mockResolvedValue(new Map());
});

describe("GET /api/groups/[groupId]/available-members", () => {
  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockedGetAuthContext.mockResolvedValue(null);
      const res = await GET(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("unauthenticated");
    });

    it("returns 400 when authenticated user has no org", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: undefined, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await GET(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("no-org");
    });
  });

  describe("tenant isolation", () => {
    it("returns 403 when group belongs to a different org", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase({ groupOrgId: OTHER_ORG_ID }));
      const res = await GET(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("forbidden");
    });

    it("returns 404 when group does not exist", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase({ groupNull: true }));
      const res = await GET(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(404);
    });
  });

  describe("input validation", () => {
    it("returns 400 for non-UUID groupId", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const req = new NextRequest("http://localhost/api/groups/not-a-uuid/available-members");
      const res = await GET(req, makeCtx("not-a-uuid") as any);
      expect(res.status).toBe(400);
    });
  });

  describe("happy path", () => {
    it("returns 200 with empty users when org has no available members", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });

      const chain: any = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: GROUP_ID, org_id: ORG_ID }, error: null }),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      mockedCreateServiceClient.mockReturnValue(chain);

      const res = await GET(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("users");
      expect(Array.isArray(json.users)).toBe(true);
    });
  });
});
