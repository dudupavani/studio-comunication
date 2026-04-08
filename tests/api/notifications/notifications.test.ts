import { NextRequest } from "next/server";
import { POST as markReadPOST } from "@/app/api/notifications/mark-read/route";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/messages/auth-context";

// Mocks
jest.mock("@/lib/supabase/server", () => ({
  createServerClientWithCookies: jest.fn(),
}));

jest.mock("@/lib/messages/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

const mockedCreateServerClientWithCookies = createServerClientWithCookies as jest.Mock;
const mockedGetAuthContext = getAuthContext as jest.Mock;

class MockSupabase {
  public _data: any = null;
  public _error: any = null;

  constructor() {
    this.from = jest.fn().mockReturnValue(this);
    this.update = jest.fn().mockReturnValue(this);
    this.eq = jest.fn().mockReturnValue(this);
    this.neq = jest.fn().mockReturnValue(this);
    this.is = jest.fn().mockReturnValue(this);
    this.filter = jest.fn().mockReturnValue(this);
  }

  from: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  is: jest.Mock;
  filter: jest.Mock;

  then(onFulfilled: any) {
    return Promise.resolve({ data: this._data, error: this._error }).then(onFulfilled);
  }
}

describe("Notifications API Routes", () => {
  const userId = "82bc5906-8b20-4e3f-98c4-df25a98d3601";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/notifications/mark-read", () => {
    it("marks inbox notifications as read successfully", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServerClientWithCookies.mockReturnValue(mockSvc);
      mockedGetAuthContext.mockResolvedValue({ userId });

      const req = new NextRequest("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ scope: "inbox" }),
      });

      const res = await markReadPOST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      
      expect(mockSvc.from).toHaveBeenCalledWith("notifications");
      expect(mockSvc.update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
      expect(mockSvc.neq).toHaveBeenCalledWith("type", "chat.message");
    });

    it("marks chat notifications as read for specific chat", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServerClientWithCookies.mockReturnValue(mockSvc);
      mockedGetAuthContext.mockResolvedValue({ userId });

      const req = new NextRequest("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ scope: "chat", chatId: "chat-123" }),
      });

      const res = await markReadPOST(req);

      expect(res.status).toBe(200);
      expect(mockSvc.eq).toHaveBeenCalledWith("type", "chat.message");
      expect(mockSvc.filter).toHaveBeenCalledWith("metadata->>chat_id", "eq", "chat-123");
    });

    it("returns 400 for invalid scope/chatId combination", async () => {
      const mockSvc = new MockSupabase();
      mockedCreateServerClientWithCookies.mockReturnValue(mockSvc);
      mockedGetAuthContext.mockResolvedValue({ userId });

      const req = new NextRequest("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ scope: "chat" }), // Missing chatId
      });

      const res = await markReadPOST(req);
      expect(res.status).toBe(400);
    });
  });
});
