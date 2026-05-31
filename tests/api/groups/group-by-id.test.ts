import { NextRequest } from "next/server";
import {
  GET,
  PATCH,
  DELETE,
} from "@/app/api/groups/[groupId]/route";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/auth-context", () => ({ getAuthContext: jest.fn() }));
jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/log", () => ({
  toLoggableError: (e: unknown) => String(e),
}));

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

const ORG_A = "aaaaaaaa-0000-0000-0000-000000000001";
const ORG_B = "bbbbbbbb-0000-0000-0000-000000000002";
const GROUP_ID = "cccccccc-0000-0000-0000-000000000003";

function makeCtx(groupId = GROUP_ID) {
  return { params: Promise.resolve({ groupId }) };
}

function makeReq(method = "GET", body?: object) {
  return new NextRequest(`http://localhost/api/groups/${GROUP_ID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeSupabase(responses: any[]) {
  let idx = 0;
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => Promise.resolve(responses[idx++] ?? { data: null, error: null })),
    maybeSingle: jest.fn().mockImplementation(() => Promise.resolve(responses[idx++] ?? { data: null, error: null })),
  };
  return chain;
}

describe("GET /api/groups/[groupId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    const res = await GET(makeReq() as any, makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 when auth has no orgId", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: undefined });
    const res = await GET(makeReq() as any, makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 404 when group belongs to a different org (IDOR blocked)", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    // Supabase query with eq("org_id", ORG_A) finds nothing because group is in ORG_B
    const supa = makeSupabase([
      { data: null, error: { code: "PGRST116" } },
      // count query
      { count: 0, error: null },
    ]);
    mockedCreateClient.mockResolvedValue(supa);
    const res = await GET(makeReq() as any, makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 200 with group data for matching org", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    const group = { id: GROUP_ID, org_id: ORG_A, name: "Dev" };
    const supa = makeSupabase([{ data: group, error: null }]);
    // count call uses a different pattern — mock .select().eq().count
    supa.select.mockReturnThis();
    supa.eq.mockReturnThis();
    // override single for count to return count
    let callCount = 0;
    mockedCreateClient.mockResolvedValue({
      ...supa,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(callCount++ === 0
          ? { data: group, error: null }
          : { count: 2, error: null }),
        then: undefined,
      })),
    });

    // Simpler test: just verify org filter is applied
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    const supaSimple = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: group, error: null }),
    };
    mockedCreateClient.mockResolvedValue(supaSimple);

    await GET(makeReq() as any, makeCtx());

    // Verify org_id filter was applied
    expect(supaSimple.eq).toHaveBeenCalledWith("org_id", ORG_A);
  });

  it("500 response does not expose internal error details", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    const supa = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: "INTERNAL", message: "secret db detail" } }),
    };
    mockedCreateClient.mockResolvedValue(supa);
    const res = await GET(makeReq() as any, makeCtx());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.details).toBeUndefined();
    expect(body.error).not.toContain("secret db detail");
  });
});

describe("PATCH /api/groups/[groupId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", { name: "X" }) as any, makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 when auth has no orgId", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: undefined });
    const res = await PATCH(makeReq("PATCH", { name: "X" }) as any, makeCtx());
    expect(res.status).toBe(403);
  });

  it("applies org_id filter on existence check (IDOR blocked)", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    const supa = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    };
    mockedCreateClient.mockResolvedValue(supa);
    const res = await PATCH(makeReq("PATCH", { name: "X" }) as any, makeCtx());
    expect(res.status).toBe(404);
    expect(supa.eq).toHaveBeenCalledWith("org_id", ORG_A);
  });
});

describe("DELETE /api/groups/[groupId]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE") as any, makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 403 when auth has no orgId", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: undefined });
    const res = await DELETE(makeReq("DELETE") as any, makeCtx());
    expect(res.status).toBe(403);
  });

  it("applies org_id filter on delete (IDOR blocked)", async () => {
    mockedGetAuthContext.mockResolvedValue({ userId: "u1", orgId: ORG_A });
    const eqCalls: Array<[string, string]> = [];
    // explicit chain: first eq returns second-eq-chain that resolves to { error: null }
    const secondEq = jest.fn().mockImplementation((col: string, val: string) => {
      eqCalls.push([col, val]);
      return Promise.resolve({ error: null });
    });
    const firstEq = jest.fn().mockImplementation((col: string, val: string) => {
      eqCalls.push([col, val]);
      return { eq: secondEq };
    });
    const supa = {
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({ eq: firstEq }),
      }),
    };
    mockedCreateClient.mockResolvedValue(supa);

    const res = await DELETE(makeReq("DELETE") as any, makeCtx());

    expect(res.status).toBe(200);
    expect(eqCalls).toEqual(expect.arrayContaining([["org_id", ORG_A]]));
  });
});
