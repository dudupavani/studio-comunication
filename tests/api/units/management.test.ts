import { NextRequest } from "next/server";
import { POST as addMembersPOST } from "@/app/api/units/[unitId]/add-members/route";
import { createServiceClient } from "@/lib/supabase/service";

// Mocks
jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

const mockedCreateServiceClient = createServiceClient as jest.Mock;

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
  });

  describe("POST /api/units/[unitId]/add-members", () => {
    it("adds new members successfully and ignores existing ones", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);

      // Sequence:
      // 1. Check existing (userId1 existing, userId2 new)
      // 2. Insert new (only userId2)
      mockSvc.setResponses([
        { data: [{ user_id: userId1 }], error: null }, // Existing memberfound
        { data: null, error: null } // Insert success
      ]);

      const req = new NextRequest(`http://localhost/api/units/${unitId}/add-members`, {
        method: "POST",
        body: JSON.stringify({ org_id: orgId, user_ids: [userId1, userId2] }),
      });

      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.inserted).toBe(1);
      
      // Verify insert was called with the correct data
      expect(mockSvc.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: userId2, unit_id: unitId, org_id: orgId })
        ]),
        { defaultToNull: false }
      );
      // Verify userId1 was filtered out
      expect(mockSvc.insert).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: userId1 })
        ]),
        expect.anything()
      );
    });

    it("returns 400 for invalid UUIDs", async () => {
      const req = new NextRequest(`http://localhost/api/units/invalid-uuid/add-members`, {
        method: "POST",
        body: JSON.stringify({ org_id: orgId, user_ids: [userId1] }),
      });

      const res = await addMembersPOST(req, { params: Promise.resolve({ unitId: "invalid-uuid" }) });
      expect(res.status).toBe(400);
    });
  });
});
