import { NextRequest } from "next/server";
import { DELETE as hardDeleteDELETE } from "@/app/api/admin/users/[id]/route";
import { DELETE as removeDELETE } from "@/app/api/users/[id]/route";
import { POST as disablePOST } from "@/app/api/users/[id]/disable/route";
import { POST as enablePOST } from "@/app/api/users/[id]/enable/route";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@supabase/supabase-js";

// Mocks
jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockedCreateServiceClient = createServiceClient as jest.Mock;
const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedSupabaseJs = createClient as jest.Mock;

class MockSupabase {
  public _responses: any[] = [];
  private _callIndex = 0;

  constructor() {
    this.from = jest.fn().mockReturnValue(this);
    this.select = jest.fn().mockReturnValue(this);
    this.update = jest.fn().mockReturnValue(this);
    this.delete = jest.fn().mockReturnValue(this);
    this.eq = jest.fn().mockReturnValue(this);
    this.single = jest.fn().mockReturnValue(this);
    this.maybeSingle = jest.fn().mockReturnValue(this);
    this.rpc = jest.fn().mockReturnValue(this);
    this.auth = {
      admin: {
        updateUserById: jest.fn().mockResolvedValue({ data: {}, error: null }),
        deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      }
    } as any;
  }

  from: jest.Mock;
  select: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  rpc: jest.Mock;
  auth: any;

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

describe("User Lifecycle API Routes", () => {
  const userId = "82bc5906-8b20-4e3f-98c4-df25a98d3601";
  const orgId = "82bc5906-8b20-4e3f-98c4-df25a98d3602";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-key";
  });

  describe("POST /api/users/[id]/disable", () => {
    it("disables user successfully when requester is org_admin of same org", async () => {
      mockedGetAuthContext.mockResolvedValue({ 
        userId: "admin-1", 
        orgId, 
        orgRole: "org_admin", 
        platformRole: null 
      });

      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);
      mockedSupabaseJs.mockReturnValue(mockSvc);

      // Sequence: 
      // 1. check org membership (select.eq.eq.single)
      // 2. check target profile roles (select.eq.maybeSingle)
      // 3. update profiles (update.eq)
      mockSvc.setResponses([
        { data: { org_id: orgId }, error: null }, // org membership
        { data: { global_role: null }, error: null }, // profile role
        { data: {}, error: null } // update
      ]);

      const req = new NextRequest(`http://localhost/api/users/${userId}/disable`, { method: "POST" });
      const res = await disablePOST(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockSvc.update).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
    });

    it("returns 403 when target user is platform_admin", async () => {
      mockedGetAuthContext.mockResolvedValue({ 
        userId: "admin-1", 
        orgId, 
        orgRole: "org_admin", 
        platformRole: null 
      });

      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);

      mockSvc.setResponses([
        { data: { org_id: orgId }, error: null }, // org membership
        { data: { global_role: "platform_admin" }, error: null }, // profile role
      ]);

      const req = new NextRequest(`http://localhost/api/users/${userId}/disable`, { method: "POST" });
      const res = await disablePOST(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Não é permitido alterar status de platform_admin");
    });
  });

  describe("POST /api/users/[id]/enable", () => {
    it("enables user successfully", async () => {
      mockedGetAuthContext.mockResolvedValue({ 
        userId: "admin-1", 
        orgId, 
        orgRole: "org_admin", 
        platformRole: null 
      });

      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);
      mockedSupabaseJs.mockReturnValue(mockSvc);

      mockSvc.setResponses([
        { data: { org_id: orgId }, error: null }, // org membership
        { data: { global_role: null }, error: null }, // profile role
        { data: {}, error: null } // update
      ]);

      const req = new NextRequest(`http://localhost/api/users/${userId}/enable`, { method: "POST" });
      const res = await enablePOST(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockSvc.update).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
    });
  });

  describe("DELETE /api/users/[id]", () => {
    it("removes org scoped links via RPC without deleting auth user", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "admin-1",
        orgId,
        orgRole: "org_admin",
        platformRole: null,
      });

      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);
      // Sequence: profiles check, org_members check, rpc remove_user_from_org
      mockSvc.setResponses([
        { data: { global_role: null }, error: null },
        { data: { org_id: orgId }, error: null },
        { data: null, error: null }, // rpc
      ]);

      const req = new NextRequest(`http://localhost/api/users/${userId}`, { method: "DELETE" });
      const res = await removeDELETE(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(200);
      expect(mockSvc.auth.admin.deleteUser).not.toHaveBeenCalled();
      // garante que não houve delete direto nas tabelas — tudo passou pela RPC
      expect(mockSvc.delete).not.toHaveBeenCalled();
      expect(mockSvc.rpc).toHaveBeenCalledWith("remove_user_from_org", {
        p_user_id: userId,
        p_org_id: orgId,
      });
    });
  });

  describe("DELETE /api/admin/users/[id]", () => {
    it("returns 401 when requester is not authenticated", async () => {
      mockedGetAuthContext.mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/admin/users/${userId}`, { method: "DELETE" });
      const res = await hardDeleteDELETE(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(401);
      expect(mockedCreateServiceClient).not.toHaveBeenCalled();
    });

    it.each([
      ["unit_user"],
      ["unit_master"],
      ["org_admin"],
      ["org_master"],
    ])("forbids %s hard delete", async (orgRole) => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "admin-1",
        orgId,
        orgRole,
        platformRole: null,
      });

      const mockSvc = new MockSupabase();
      mockedCreateServiceClient.mockReturnValue(mockSvc);

      const req = new NextRequest(`http://localhost/api/admin/users/${userId}`, { method: "DELETE" });
      const res = await hardDeleteDELETE(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(403);
      expect(mockedCreateServiceClient).not.toHaveBeenCalled();
      expect(mockSvc.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("allows platform_admin hard delete for non platform target", async () => {
      mockedGetAuthContext.mockResolvedValue({
        userId: "platform-1",
        orgId,
        orgRole: null,
        platformRole: "platform_admin",
      });

      const mockSvc = new MockSupabase();
      mockSvc.auth.admin.deleteUser = jest.fn().mockResolvedValue({ data: {}, error: null });
      mockedCreateServiceClient.mockReturnValue(mockSvc);
      mockSvc.setResponses([
        { data: { global_role: null }, error: null },
        { data: {}, error: null },
        { data: {}, error: null },
        { data: {}, error: null },
        { data: {}, error: null },
        { data: {}, error: null },
        { data: {}, error: null },
      ]);

      const req = new NextRequest(`http://localhost/api/admin/users/${userId}`, { method: "DELETE" });
      const res = await hardDeleteDELETE(req, { params: Promise.resolve({ id: userId }) });

      expect(res.status).toBe(200);
      expect(mockSvc.auth.admin.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});
