import UsersPage from "@/app/(app)/users/page";
import UsersClient from "@/components/users/users-client";
import { getAuthContext } from "@/lib/auth-context";
import { getUsers } from "@/lib/actions/user";
import { canManageUsers } from "@/lib/permissions-users";
import { isPlatformAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/actions/user", () => ({
  getUsers: jest.fn(),
}));

jest.mock("@/lib/permissions-users", () => ({
  canManageUsers: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  isPlatformAdmin: jest.fn(),
}));

jest.mock("@/components/users/users-client", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedGetUsers = getUsers as jest.MockedFunction<typeof getUsers>;
const mockedCanManageUsers =
  canManageUsers as jest.MockedFunction<typeof canManageUsers>;
const mockedIsPlatformAdmin =
  isPlatformAdmin as jest.MockedFunction<typeof isPlatformAdmin>;
const mockedUsersClient = UsersClient as unknown as jest.Mock;

describe("app/(app)/users/page", () => {
  let logSpy: jest.SpyInstance;
  let timeSpy: jest.SpyInstance;
  let timeEndSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });

    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    timeSpy = jest.spyOn(console, "time").mockImplementation(() => {});
    timeEndSpy = jest.spyOn(console, "timeEnd").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    timeSpy.mockRestore();
    timeEndSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("redirects to root when auth context is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    await expect(
      UsersPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("REDIRECT:/");

    expect(mockedRedirect).toHaveBeenCalledWith("/");
    expect(mockedGetUsers).not.toHaveBeenCalled();
  });

  it("redirects to force-password when user must set password", async () => {
    mockedGetAuthContext.mockResolvedValue({
      user: {
        user_metadata: {
          must_set_password: true,
        },
      },
    } as any);

    await expect(
      UsersPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("REDIRECT:/auth/force-password");

    expect(mockedRedirect).toHaveBeenCalledWith("/auth/force-password");
    expect(mockedCanManageUsers).not.toHaveBeenCalled();
    expect(mockedGetUsers).not.toHaveBeenCalled();
  });

  it("redirects to profile when user cannot manage users", async () => {
    mockedGetAuthContext.mockResolvedValue({
      user: { user_metadata: {} },
      orgId: "org-1",
    } as any);
    mockedCanManageUsers.mockReturnValue(false);

    await expect(
      UsersPage({
        searchParams: Promise.resolve({ role: "org_admin" }),
      })
    ).rejects.toThrow("REDIRECT:/profile");

    expect(mockedCanManageUsers).toHaveBeenCalled();
    expect(mockedRedirect).toHaveBeenCalledWith("/profile");
    expect(mockedGetUsers).not.toHaveBeenCalled();
  });

  it("loads users and passes computed props to UsersClient", async () => {
    const auth = {
      user: { user_metadata: {} },
      orgId: "org-1",
      orgRole: "org_admin",
      platformRole: null,
    } as any;
    const users = [
      { id: "u-1", full_name: "Ana" },
      { id: "u-2", full_name: "Bruno" },
    ] as any;

    mockedGetAuthContext.mockResolvedValue(auth);
    mockedCanManageUsers.mockReturnValue(true);
    mockedIsPlatformAdmin.mockReturnValue(true);
    mockedGetUsers.mockResolvedValue(users);

    const element = (await UsersPage({
      searchParams: Promise.resolve({ role: ["org_admin", "unit_user"] }),
    })) as any;

    expect(mockedGetUsers).toHaveBeenCalledWith("org-1");
    expect(element.props.className).toBe("p-4");

    const clientElement = element.props.children;
    expect(clientElement.type).toBe(mockedUsersClient);
    expect(clientElement.props.initialUsers).toEqual(users);
    expect(clientElement.props.authContext).toBe(auth);
    expect(clientElement.props.canPlatform).toBe(true);
    expect(clientElement.props.roleFilter).toBe("org_admin");
  });
});
