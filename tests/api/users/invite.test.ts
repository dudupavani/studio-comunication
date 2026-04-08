import { NextRequest } from "next/server";
import { POST as invitePOST } from "@/app/api/users/invite-magic/route";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { createClient } from "@supabase/supabase-js";

// Mocks
jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/permissions-users", () => ({
  canManageUsers: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/log", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCanManageUsers = canManageUsers as jest.Mock;
const mockedSupabaseJs = createClient as jest.Mock;

class MockSupabase {
  public auth: any;
  public _responses: any[] = [];
  private _callIndex = 0;

  constructor() {
    this.from = jest.fn().mockReturnValue(this);
    this.select = jest.fn().mockReturnValue(this);
    this.eq = jest.fn().mockReturnValue(this);
    this.maybeSingle = jest.fn().mockReturnValue(this);
    this.auth = {
      signInWithOtp: jest.fn().mockResolvedValue({ error: null })
    };
  }

  from: jest.Mock;
  select: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;

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

describe("User Invitation API Routes", () => {
  const inviterId = "82bc5906-8b20-4e3f-98c4-df25a98d3600";
  const orgId = "82bc5906-8b20-4e3f-98c4-df25a98d3601";
  const invitedEmail = "newuser@example.com";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-key";
  });

  describe("POST /api/users/invite-magic", () => {
    it("sends magic link invite successfully", async () => {
      const mockAdmin = new MockSupabase();
      mockedGetAuthContext.mockResolvedValue({ user: { id: inviterId }, orgId });
      mockedCanManageUsers.mockReturnValue(true);
      mockedSupabaseJs.mockReturnValue(mockAdmin);

      // Sequence: 
      // 1. Check org membership of inviter for target org
      mockAdmin.setResponses([
        { data: { role: "org_admin" }, error: null }
      ]);

      const req = new NextRequest("http://localhost/api/users/invite-magic", {
        method: "POST",
        body: JSON.stringify({ email: invitedEmail, orgId, role: "unit_user" }),
      });

      const res = await invitePOST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      expect(mockAdmin.auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
        email: invitedEmail,
        options: expect.objectContaining({
          data: expect.objectContaining({
            invited_org_id: orgId,
            invited_role: "unit_user"
          })
        })
      }));
    });

    it("returns 403 if requester cannot manage users", async () => {
      mockedGetAuthContext.mockResolvedValue({ user: { id: inviterId } });
      mockedCanManageUsers.mockReturnValue(false);

      const req = new NextRequest("http://localhost/api/users/invite-magic", {
        method: "POST",
        body: JSON.stringify({ email: invitedEmail, orgId }),
      });

      const res = await invitePOST(req);
      expect(res.status).toBe(403);
    });

    it("returns 403 if requester is not admin of specified org", async () => {
      const mockAdmin = new MockSupabase();
      mockedGetAuthContext.mockResolvedValue({ user: { id: inviterId } });
      mockedCanManageUsers.mockReturnValue(true);
      mockedSupabaseJs.mockReturnValue(mockAdmin);

      // Inviter is NOT an admin of the specified org
      mockAdmin.setResponses([
        { data: { role: "unit_user" }, error: null }
      ]);

      const req = new NextRequest("http://localhost/api/users/invite-magic", {
        method: "POST",
        body: JSON.stringify({ email: invitedEmail, orgId }),
      });

      const res = await invitePOST(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Você não é admin da organização");
    });
  });
});
