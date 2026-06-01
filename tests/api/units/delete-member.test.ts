import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/units/[unitId]/members/[userId]/route";
import { getAuthContext } from "@/lib/auth-context";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("@/lib/auth-context", () => ({ getAuthContext: jest.fn() }));
jest.mock("@/lib/supabase/service", () => ({ createServiceClient: jest.fn() }));
jest.mock("@/lib/permissions/user-functions", () => ({
  canUsePermission: jest.fn().mockResolvedValue(true),
}));

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCreateServiceClient = createServiceClient as jest.Mock;

const ORG_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const OTHER_ORG_ID = "aaaaaaaa-0000-0000-0000-000000000099";
const UNIT_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const USER_ID = "cccccccc-0000-0000-0000-000000000003";

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost/api/units/${UNIT_ID}/members/${USER_ID}`,
    { method: "DELETE" }
  );
}

function makeCtx(unitId = UNIT_ID, userId = USER_ID) {
  return { params: Promise.resolve({ unitId, userId }) };
}

function makeDeleteChain(error: object | null = null) {
  const chain: any = { eq: jest.fn() };
  chain.eq.mockReturnValue(chain);
  chain.then = (resolve: any) => Promise.resolve({ error }).then(resolve);
  return chain;
}

function makeSupabase(opts: {
  unitOrgId?: string;
  unitNotFound?: boolean;
  unitErr?: object | null;
  linkRow?: object | null;
  deleteErr?: object | null;
} = {}) {
  const {
    unitOrgId = ORG_ID,
    unitNotFound = false,
    unitErr = null,
    linkRow = { user_id: USER_ID },
    deleteErr = null,
  } = opts;

  const unitData = unitNotFound || unitErr ? null : { id: UNIT_ID, org_id: unitOrgId };

  // maybeSingle é chamado duas vezes: primeiro para unit lookup, depois para link check
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn()
      .mockResolvedValueOnce({ data: unitData, error: unitErr ?? null })
      .mockResolvedValueOnce({ data: linkRow, error: null }),
    delete: jest.fn().mockReturnValue(makeDeleteChain(deleteErr)),
  };
  return chain;
}

beforeEach(() => jest.clearAllMocks());

describe("DELETE /api/units/[unitId]/members/[userId]", () => {
  describe("authentication", () => {
    it("returns 401 when not authenticated", async () => {
      mockedGetAuthContext.mockResolvedValue(null);
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("unauthenticated");
    });

    it("returns 400 when authenticated user has no org", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: undefined, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("no-org");
    });
  });

  describe("authorization — canManageUnit", () => {
    it("returns 403 for unit_user", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "unit_user", platformRole: null, unitIds: [UNIT_ID],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(403);
    });

    it("returns 403 for unit_master of a different unit", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "unit_master",
        platformRole: null, unitIds: ["dddddddd-0000-0000-0000-000000000099"],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(403);
    });
  });

  describe("tenant isolation", () => {
    it("returns 404 when unit does not exist", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase({ unitNotFound: true }));
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(404);
    });

    it("returns 403 when unit belongs to a different org", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase({ unitOrgId: OTHER_ORG_ID }));
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/organização/i);
    });
  });

  describe("happy path", () => {
    const orgAdminCtx = {
      userId: "me", orgId: ORG_ID, orgRole: "org_admin" as const,
      platformRole: null as null, unitIds: [] as string[],
    };

    it("allows org_admin and returns removed:1", async () => {
      mockedGetAuthContext.mockResolvedValue(orgAdminCtx);
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true, removed: 1 });
    });

    it("allows org_master", async () => {
      mockedGetAuthContext.mockResolvedValue({ ...orgAdminCtx, orgRole: "org_master" });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
    });

    it("allows unit_master of the target unit", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "unit_master",
        platformRole: null, unitIds: [UNIT_ID],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
    });

    it("allows platform_admin", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: null,
        platformRole: "platform_admin", unitIds: [],
      });
      mockedCreateServiceClient.mockReturnValue(makeSupabase());
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
    });

    it("returns removed:0 when link does not exist (idempotent)", async () => {
      mockedGetAuthContext.mockResolvedValue(orgAdminCtx);
      mockedCreateServiceClient.mockReturnValue(makeSupabase({ linkRow: null }));
      const res = await DELETE(makeRequest(), makeCtx() as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true, removed: 0 });
    });
  });

  describe("input validation", () => {
    it("returns 400 for invalid unitId", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      const req = new NextRequest(
        `http://localhost/api/units/not-a-uuid/members/${USER_ID}`,
        { method: "DELETE" }
      );
      const res = await DELETE(req, makeCtx("not-a-uuid", USER_ID) as any);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid userId", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "me", orgId: ORG_ID, orgRole: "org_admin", platformRole: null, unitIds: [],
      });
      const req = new NextRequest(
        `http://localhost/api/units/${UNIT_ID}/members/not-a-uuid`,
        { method: "DELETE" }
      );
      const res = await DELETE(req, makeCtx(UNIT_ID, "not-a-uuid") as any);
      expect(res.status).toBe(400);
    });
  });
});
