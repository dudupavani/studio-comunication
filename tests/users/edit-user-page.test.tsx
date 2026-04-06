import { renderToStaticMarkup } from "react-dom/server";

import EditUserPage from "@/app/(app)/users/[id]/edit/page";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { getUserById, getUserRoles } from "@/lib/actions/user";
import { listUnits } from "@/lib/actions/units";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

const mockEditUserForm = jest.fn(() => null);

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock("@/components/users/edit-user-form", () => ({
  __esModule: true,
  default: (props: any) => {
    mockEditUserForm(props);
    return null;
  },
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/permissions-users", () => ({
  canManageUsers: jest.fn(),
}));

jest.mock("@/lib/actions/user", () => ({
  getUserById: jest.fn(),
  getUserRoles: jest.fn(),
}));

jest.mock("@/lib/actions/units", () => ({
  listUnits: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedNotFound = notFound as jest.MockedFunction<typeof notFound>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedCanManageUsers =
  canManageUsers as jest.MockedFunction<typeof canManageUsers>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedListUnits = listUnits as jest.MockedFunction<typeof listUnits>;
const mockedGetUserRoles =
  getUserRoles as jest.MockedFunction<typeof getUserRoles>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe("app/(app)/users/[id]/edit/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    mockedNotFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
  });

  it("redirects to root when auth context is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    await expect(
      EditUserPage({
        params: Promise.resolve({ id: "user-1" }),
      })
    ).rejects.toThrow("REDIRECT:/");

    expect(mockedRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to profile when user cannot manage users", async () => {
    mockedGetAuthContext.mockResolvedValue({ orgId: "org-1" } as any);
    mockedCanManageUsers.mockReturnValue(false);

    await expect(
      EditUserPage({
        params: Promise.resolve({ id: "user-1" }),
      })
    ).rejects.toThrow("REDIRECT:/profile");

    expect(mockedRedirect).toHaveBeenCalledWith("/profile");
  });

  it("redirects to profile when auth has no orgId", async () => {
    mockedGetAuthContext.mockResolvedValue({ orgId: null } as any);
    mockedCanManageUsers.mockReturnValue(true);

    await expect(
      EditUserPage({
        params: Promise.resolve({ id: "user-1" }),
      })
    ).rejects.toThrow("REDIRECT:/profile");

    expect(mockedRedirect).toHaveBeenCalledWith("/profile");
  });

  it("calls notFound when target user does not exist", async () => {
    mockedGetAuthContext.mockResolvedValue({ orgId: "org-1" } as any);
    mockedCanManageUsers.mockReturnValue(true);
    mockedGetUserById.mockResolvedValue(null as any);
    mockedListUnits.mockResolvedValue({ ok: true, data: [] } as any);
    mockedGetUserRoles.mockResolvedValue({
      ok: true,
      data: { role: null, unitId: null, teamId: null },
    } as any);

    const teamsOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const employeeMaybeSingle = jest
      .fn()
      .mockResolvedValue({ data: null, error: null });

    mockedCreateClient.mockReturnValue({
      from: (table: string) => {
        if (table === "equipes") {
          return {
            select: () => ({
              eq: () => ({
                order: teamsOrder,
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: employeeMaybeSingle,
              }),
            }),
          }),
        };
      },
    } as any);

    await expect(
      EditUserPage({
        params: Promise.resolve({ id: "user-404" }),
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockedNotFound).toHaveBeenCalled();
  });

  it("renders edit form with loaded defaults", async () => {
    mockedGetAuthContext.mockResolvedValue({ orgId: "org-1" } as any);
    mockedCanManageUsers.mockReturnValue(true);
    mockedGetUserById.mockResolvedValue({
      full_name: "Ana Silva",
      email: "ana@example.com",
      phone: "+55 11 99999-1234",
    } as any);
    mockedListUnits.mockResolvedValue({
      ok: true,
      data: [{ id: "unit-1", name: "Unidade 1" }],
    } as any);
    mockedGetUserRoles.mockResolvedValue({
      ok: true,
      data: { role: "unit_master", unitId: "unit-1", teamId: "team-1" },
    } as any);

    const teamsOrder = jest.fn().mockResolvedValue({
      data: [{ id: "team-1", name: "Equipe 1" }],
      error: null,
    });
    const employeeMaybeSingle = jest.fn().mockResolvedValue({
      data: { cargo: "Designer", data_entrada: "2026-03-01" },
      error: null,
    });

    mockedCreateClient.mockReturnValue({
      from: (table: string) => {
        if (table === "equipes") {
          return {
            select: () => ({
              eq: () => ({
                order: teamsOrder,
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: employeeMaybeSingle,
              }),
            }),
          }),
        };
      },
    } as any);

    const element = await EditUserPage({
      params: Promise.resolve({ id: "user-1" }),
    });
    renderToStaticMarkup(element as any);

    expect(mockEditUserForm).toHaveBeenCalledTimes(1);
    expect(mockEditUserForm).toHaveBeenCalledWith({
      userId: "user-1",
      orgId: "org-1",
      defaultName: "Ana Silva",
      defaultEmail: "ana@example.com",
      defaultPhone: "+55 11 99999-1234",
      defaultCargo: "Designer",
      defaultEntryDate: "2026-03-01",
      units: [{ id: "unit-1", name: "Unidade 1" }],
      teams: [{ id: "team-1", name: "Equipe 1" }],
      currentRole: "unit_master",
      currentUnitId: "unit-1",
      currentTeamId: "team-1",
    });
  });

  it("applies safe fallbacks for units, roles and employee profile", async () => {
    mockedGetAuthContext.mockResolvedValue({ orgId: "org-1" } as any);
    mockedCanManageUsers.mockReturnValue(true);
    mockedGetUserById.mockResolvedValue({
      full_name: "Bruno Costa",
      email: "bruno@example.com",
      phone: null,
    } as any);
    mockedListUnits.mockResolvedValue({ ok: false, data: null } as any);
    mockedGetUserRoles.mockResolvedValue({ ok: false, data: null } as any);

    const teamsOrder = jest.fn().mockResolvedValue({ data: null, error: null });
    const employeeMaybeSingle = jest
      .fn()
      .mockResolvedValue({ data: null, error: null });

    mockedCreateClient.mockReturnValue({
      from: (table: string) => {
        if (table === "equipes") {
          return {
            select: () => ({
              eq: () => ({
                order: teamsOrder,
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: employeeMaybeSingle,
              }),
            }),
          }),
        };
      },
    } as any);

    const element = await EditUserPage({
      params: Promise.resolve({ id: "user-2" }),
    });
    renderToStaticMarkup(element as any);

    expect(mockEditUserForm).toHaveBeenCalledTimes(1);
    expect(mockEditUserForm).toHaveBeenCalledWith(
      expect.objectContaining({
        units: [],
        teams: [],
        currentRole: null,
        currentUnitId: null,
        currentTeamId: null,
        defaultCargo: null,
        defaultEntryDate: null,
      })
    );
  });
});
