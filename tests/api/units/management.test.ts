import { NextRequest } from "next/server";
import { POST as addMembersPOST } from "@/app/api/units/[unitId]/add-members/route";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));
jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

const mockedCreateServiceClient = createServiceClient as jest.Mock;
const mockedGetAuthContext = getAuthContext as jest.Mock;

class MockSupabase {
  public _responses: any[] = [];
  private _callIndex = 0;

  constructor() {
    this.from = jest.fn().mockReturnValue(this);
    this.select = jest.fn().mockReturnValue(this);
    this.insert = jest.fn().mockReturnValue(this);
    this.eq = jest.fn().mockReturnValue(this);
    this.in = jest.fn().mockReturnValue(this);
  }

  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;

  setResponses(responses: any[]) {
    this._responses = responses;
    this._callIndex = 0;
  }

  then(onFulfilled: any) {
    let result = { data: null, error: null };
    if (this._responses.length > 0 && this._callIndex < this._responses.length) {
      result = this._responses[this._callIndex];
      this._callIndex++;
    }
    return Promise.resolve(result).then(onFulfilled);
  }
}

describe("Unit Management API Routes", () => {
  const unitId = "82bc5906-8b20-4e3f-98c4-df25a98d3600";
  const orgId = "82bc5906-8b20-4e3f-98c4-df25a98d3601";
  const userId1 = "82bc5906-8b20-4e3f-98c4-df25a98d3602";
  const userId2 = "82bc5906-8b20-4e3f-98c4-df25a98d3603";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthContext.mockResolvedValue({
      userId: "admin-user",
      orgId,
      orgRole: "org_admin",
      platformRole: null,
      unitIds: [],
    });
  });

  describe("POST /api/units/[unitId]/add-members", () => {
    it("adds new members successfully and ignores existing ones", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);

      mockSvc.setResponses([
        { data: [{ user_id: userId1 }], error: null },
        { data: null, error: null },
      ]);

      const req = new NextRequest(`http://localhost/api/units/${unitId}/add-members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [userId1, userId2] }),
      });

      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.inserted).toBe(1);

      expect(mockSvc.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: userId2, unit_id: unitId, org_id: orgId }),
        ]),
        { defaultToNull: false }
      );
      expect(mockSvc.insert).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ user_id: userId1 })]),
        expect.anything()
      );
    });

    it("returns 401 when not authenticated", async () => {
      mockedGetAuthContext.mockResolvedValue(null);
      const req = new NextRequest(`http://localhost/api/units/${unitId}/add-members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [userId1] }),
      });
      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId }) });
      expect(res.status).toBe(401);
    });

    it("returns 403 for unit_user", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "unit-user", orgId, orgRole: "unit_user", platformRole: null, unitIds: [unitId],
      });
      const req = new NextRequest(`http://localhost/api/units/${unitId}/add-members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [userId1] }),
      });
      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId }) });
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid unitId", async () => {
      const req = new NextRequest(`http://localhost/api/units/invalid-uuid/add-members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [userId1] }),
      });
      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId: "invalid-uuid" }) });
      expect(res.status).toBe(400);
    });

    it("org_id in insert row comes from auth context, not request body", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);
      mockSvc.setResponses([
        { data: [], error: null },
        { data: null, error: null },
      ]);

      const req = new NextRequest(`http://localhost/api/units/${unitId}/add-members`, {
        method: "POST",
        body: JSON.stringify({ org_id: "fake-org-id-should-be-ignored", user_ids: [userId2] }),
      });

      await addMembersPOST(req, { params: Promise.resolve({ unitId }) });

      expect(mockSvc.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ org_id: orgId }),
        ]),
        expect.anything()
      );
      expect(mockSvc.insert).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ org_id: "fake-org-id-should-be-ignored" }),
        ]),
        expect.anything()
      );
    });
  });
});
