import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/units/[unitId]/members/route";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/auth-context", () => ({ getAuthContext: jest.fn() }));
jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/permissions/user-functions", () => ({
  canUsePermission: jest.fn().mockResolvedValue(true),
}));

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCreateClient = createClient as jest.Mock;

const ORG_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const UNIT_ID = "bbbbbbbb-0000-0000-0000-000000000002";
const USER_ID = "cccccccc-0000-0000-0000-000000000003";

function makeSupabase(unitRow: object | null = { id: UNIT_ID, org_id: ORG_ID }) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: unitRow, error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
    delete: jest.fn().mockReturnThis(),
  };
  return chain;
}

function makeRequest(method: "POST" | "DELETE", body?: object, search?: string): NextRequest {
  const url = `http://localhost/api/units/${UNIT_ID}/members${search ?? ""}`;
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeCtx() {
  return { params: Promise.resolve({ unitId: UNIT_ID }) };
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/units/[unitId]/members — role check", () => {
  const req = () => makeRequest("POST", { userId: USER_ID });

  it("returns 403 for unit_user", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_user",
      platformRole: null, unitIds: [UNIT_ID],
    });
    mockedCreateClient.mockResolvedValue(makeSupabase());
    const res = await POST(req(), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("returns 403 for unit_master of a different unit", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_master",
      platformRole: null, unitIds: ["other-unit"],
    });
    mockedCreateClient.mockResolvedValue(makeSupabase());
    const res = await POST(req(), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("allows unit_master of the target unit to proceed past role check", async () => {
    const supa = makeSupabase();
    // org_members check → user is in org
    supa.maybeSingle
      .mockResolvedValueOnce({ data: { id: UNIT_ID, org_id: ORG_ID }, error: null }) // unit lookup
      .mockResolvedValueOnce({ data: { user_id: USER_ID }, error: null })             // org_member check
      .mockResolvedValueOnce({ data: null, error: null });                            // duplicate check
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_master",
      platformRole: null, unitIds: [UNIT_ID],
    });
    mockedCreateClient.mockResolvedValue(supa);
    const res = await POST(req(), makeCtx() as any);
    expect(res.status).toBe(200);
  });

  it("allows org_admin", async () => {
    const supa = makeSupabase();
    supa.maybeSingle
      .mockResolvedValueOnce({ data: { id: UNIT_ID, org_id: ORG_ID }, error: null })
      .mockResolvedValueOnce({ data: { user_id: USER_ID }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "org_admin",
      platformRole: null, unitIds: [],
    });
    mockedCreateClient.mockResolvedValue(supa);
    const res = await POST(req(), makeCtx() as any);
    expect(res.status).toBe(200);
  });

  it("allows platform_admin", async () => {
    const supa = makeSupabase();
    supa.maybeSingle
      .mockResolvedValueOnce({ data: { id: UNIT_ID, org_id: ORG_ID }, error: null })
      .mockResolvedValueOnce({ data: { user_id: USER_ID }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: null,
      platformRole: "platform_admin", unitIds: [],
    });
    mockedCreateClient.mockResolvedValue(supa);
    const res = await POST(req(), makeCtx() as any);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/units/[unitId]/members — role check", () => {
  const req = () => makeRequest("DELETE", { userId: USER_ID });

  it("returns 403 for unit_user", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_user",
      platformRole: null, unitIds: [UNIT_ID],
    });
    mockedCreateClient.mockResolvedValue(makeSupabase());
    const res = await DELETE(req(), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("returns 403 for unit_master of a different unit", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_master",
      platformRole: null, unitIds: ["other-unit"],
    });
    mockedCreateClient.mockResolvedValue(makeSupabase());
    const res = await DELETE(req(), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("allows unit_master of the target unit", async () => {
    const supa = makeSupabase();
    supa.maybeSingle.mockResolvedValueOnce({ data: { id: UNIT_ID, org_id: ORG_ID }, error: null });
    supa.delete.mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) });
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "unit_master",
      platformRole: null, unitIds: [UNIT_ID],
    });
    mockedCreateClient.mockResolvedValue(supa);
    const res = await DELETE(req(), makeCtx() as any);
    expect(res.status).toBe(200);
  });

  it("allows org_master", async () => {
    const supa = makeSupabase();
    supa.maybeSingle.mockResolvedValueOnce({ data: { id: UNIT_ID, org_id: ORG_ID }, error: null });
    supa.delete.mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) });
    mockedGetAuthContext.mockResolvedValue({
      userId: "me", orgId: ORG_ID, orgRole: "org_master",
      platformRole: null, unitIds: [],
    });
    mockedCreateClient.mockResolvedValue(supa);
    const res = await DELETE(req(), makeCtx() as any);
    expect(res.status).toBe(200);
  });
});
