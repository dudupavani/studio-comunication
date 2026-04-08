import { GET } from "@/app/(auth)/callback/route";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock do supabase server client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock do NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn().mockImplementation((url) => ({ url })),
  },
}));

describe("Auth Callback Route", () => {
  const mockSupabase = {
    auth: {
      exchangeCodeForSession: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it("exchanges code for session and redirects to next param", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code&next=/dashboard");
    
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { must_set_password: true } } },
    });

    const response = await GET(request);

    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost:3000/dashboard");
  });

  it("redirects to error page if exchange fails", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=invalid-code");
    
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "Invalid code" } });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost:3000/auth/auth-code-error");
  });

  it("updates user metadata if must_set_password is not true", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code");
    
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { must_set_password: false } } },
    });

    await GET(request);

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { must_set_password: true }
    });
  });

  it("redirects to / even if next param is missing", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code");
    
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { user_metadata: { must_set_password: true } } },
    });

    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost:3000/");
  });
});
