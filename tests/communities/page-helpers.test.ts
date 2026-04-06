import {
  loadCommunitiesPageContext,
  resolveCreateCommunityPermission,
  resolveManagePermission,
} from "@/app/(app)/comunidades/page-helpers";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedNotFound = notFound as jest.MockedFunction<typeof notFound>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe("comunidades/page-helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permission resolvers allow platform admin, org admin and org master", () => {
    const auth = {
      platformRole: null,
      orgRole: "org_master",
    } as any;

    expect(resolveManagePermission(auth)).toBe(true);
    expect(resolveCreateCommunityPermission(auth)).toBe(true);
    expect(
      resolveManagePermission({ platformRole: null, orgRole: "unit_user" } as any),
    ).toBe(false);
  });

  it("calls notFound when auth context is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);
    mockedNotFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });

    await expect(loadCommunitiesPageContext()).rejects.toThrow("NOT_FOUND");
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("loads profile and builds user context", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "org_admin",
      unitIds: [],
      user: {
        email: "user@example.com",
        created_at: "2026-01-01T00:00:00.000Z",
        user_metadata: {
          name: "Fallback Name",
          avatar_url: "fallback-avatar",
        },
      },
    } as any);

    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        full_name: "Nome Perfil",
        phone: "+55 11 99999-0000",
        avatar_url: "profile-avatar",
      },
      error: null,
    });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));

    mockedCreateClient.mockReturnValue({ from } as any);

    const result = await loadCommunitiesPageContext();

    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("full_name, phone, avatar_url");
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(result.canManage).toBe(true);
    expect(result.canCreateCommunity).toBe(true);
    expect(result.userProfile).toMatchObject({
      id: "user-1",
      email: "user@example.com",
      full_name: "Nome Perfil",
      phone: "+55 11 99999-0000",
      avatar_url: "profile-avatar",
    });
  });
});
