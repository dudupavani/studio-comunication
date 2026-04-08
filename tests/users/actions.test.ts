import { 
  getMyOrgMembership, 
  getUserById, 
  deleteUser, 
  updateUserRoles,
  updateUserProfile 
} from "@/lib/actions/user";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("User Actions", () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      admin: {
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  };

  const mockSvc = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    
    (createClient as any).mockReturnValue(mockSupabase);
    (createServiceClient as any).mockReturnValue(mockSvc);
    (createAdminClient as any).mockReturnValue(mockSupabase); // Mock internal admin client too
  });

  describe("getMyOrgMembership", () => {
    it("returns membership data for logged in user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { org_id: "o1", role: "org_admin" } }),
      });

      const result = await getMyOrgMembership();
      expect(result).toEqual({ org_id: "o1", role: "org_admin" });
    });
  });

  describe("getUserById", () => {
    it("returns profile combined with auth data", async () => {
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: "u2", email: "test@ex.com", created_at: "2024-01-01" } },
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "u2", full_name: "Test User", disabled: false },
        }),
      });

      const result = await getUserById("u2");
      expect(result).toMatchObject({
        id: "u2",
        email: "test@ex.com",
        full_name: "Test User",
      });
    });
  });

  describe("deleteUser", () => {
    it("prevents deleting platform_admin", async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { global_role: "platform_admin" } }),
      });

      const result = await deleteUser("admin-id");
      expect(result.error).toContain("platform_admin não podem ser deletados");
    });
  });

  describe("updateUserRoles", () => {
    const input = {
      userId: "u3",
      orgId: "o1",
      targetRole: "unit_user" as const,
      unitId: "un1",
      teamId: "t1"
    };

    it("updates role and unit/team associations", async () => {
      // Setup checks
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-u" } } });
      
      // Permission check (platform admin)
      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({ data: true });

      // Unit/Team existence checks
      mockSvc.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: "exists", org_id: "o1" } }),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnThis(),
      }));

      // Org membership state
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { org_id: "o1", role: "unit_user" } }),
      });

      const result = await updateUserRoles(input);
      expect(result.ok).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith("/users");
    });
  });

  describe("updateUserProfile", () => {
    it("updates name and phone", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u-self" } } });
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });

      const formData = new FormData();
      formData.append("name", "New Name");
      formData.append("phone", "123456");

      const result = await updateUserProfile(formData);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: "New Name" })
      }));
    });
  });

  describe("getUsers", () => {
    const { getUsers } = require("@/lib/actions/user");

    it("fetches and maps users with roles and names", async () => {
      const createMockChain = (data: any = []) => {
        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          then: jest.fn().mockImplementation((onSuccess) => {
            return Promise.resolve(onSuccess({ data, error: null }));
          }),
        };
        return chain;
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "org_members") {
          return createMockChain([{ user_id: "u1", role: "org_admin" }]);
        }
        if (table === "profiles") {
          return createMockChain([{ id: "u1", full_name: "Ana" }]);
        }
        return createMockChain([]);
      });

      mockSupabase.auth.admin.getUserById.mockResolvedValue({ data: { user: { email: "ana@ex.com" } } });

      const result = await getUsers("o1");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "u1",
        email: "ana@ex.com",
        full_name: "Ana",
        org_role: "org_admin"
      });
    });
  });
});
