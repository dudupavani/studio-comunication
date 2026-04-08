import { signIn, signOut, sendPasswordResetEmail, updatePassword } from "@/lib/actions/auth";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

// Mock do supabase server client
jest.mock("@/lib/supabase/server", () => ({
  createServerClientWithCookies: jest.fn(),
}));

// Mock do next/navigation
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock do next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

describe("Auth Server Actions", () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerClientWithCookies as jest.Mock).mockReturnValue(mockSupabase);
    (headers as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue("http://localhost:3000"),
    });
  });

  describe("signIn", () => {
    it("redirects to /comunidades on successful sign in", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

      await signIn(formData);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(redirect).toHaveBeenCalledWith("/comunidades");
    });

    it("returns error message on failed sign in", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrong-password");

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: "Invalid credentials" },
      });

      const result = await signIn(formData);

      expect(result).toEqual({ error: "Invalid credentials" });
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut and redirects to /login", async () => {
      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("returns error: null on successful reset email request", async () => {
      const formData = new FormData();
      formData.append("email", "user@example.com");

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await sendPasswordResetEmail(formData);

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/auth/recovery") })
      );
      expect(result).toEqual({ error: null });
    });

    it("returns error message on failure", async () => {
      const formData = new FormData();
      formData.append("email", "unknown@example.com");

      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: "User not found" },
      });

      const result = await sendPasswordResetEmail(formData);

      expect(result).toEqual({ error: "User not found" });
    });
  });

  describe("updatePassword", () => {
    it("calls supabase updateUser and redirects to /login on success", async () => {
      const formData = new FormData();
      formData.append("password", "new-password123");

      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      await updatePassword(formData);

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "new-password123",
      });
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("returns error message on failure", async () => {
      const formData = new FormData();
      formData.append("password", "123");

      mockSupabase.auth.updateUser.mockResolvedValue({
        error: { message: "Password too weak" },
      });

      const result = await updatePassword(formData);

      expect(result).toEqual({ error: "Password too weak" });
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
