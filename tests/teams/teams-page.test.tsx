import { renderToStaticMarkup } from "react-dom/server";

import TeamsPage from "@/app/(app)/teams/page";
import { getAuthContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import TeamsClient from "@/components/teams/TeamsClient";
import { enrichOrgUsersWithAuthMetadata } from "@/lib/teams/enrich-org-users";
import { enrichOrgUsersWithEmployeeProfile } from "@/lib/teams/user-directory";

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/components/teams/TeamsClient", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock("@/lib/teams/enrich-org-users", () => ({
  enrichOrgUsersWithAuthMetadata: jest.fn(),
}));

jest.mock("@/lib/teams/user-directory", () => ({
  enrichOrgUsersWithEmployeeProfile: jest.fn(),
}));

const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedTeamsClient = TeamsClient as unknown as jest.Mock;
const mockedEnrichOrgUsersWithAuthMetadata =
  enrichOrgUsersWithAuthMetadata as jest.MockedFunction<
    typeof enrichOrgUsersWithAuthMetadata
  >;
const mockedEnrichOrgUsersWithEmployeeProfile =
  enrichOrgUsersWithEmployeeProfile as jest.MockedFunction<
    typeof enrichOrgUsersWithEmployeeProfile
  >;

function makeAwaitableQuery<T>(result: T) {
  const query: any = {
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    then: (
      onFulfilled: (value: T) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) =>
      Promise.resolve(result).catch(onRejected),
    finally: (onFinally: () => void) => Promise.resolve(result).finally(onFinally),
  };
  return query;
}

describe("app/(app)/teams/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders session expired message when auth is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    const element = await TeamsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Sessão expirada. Faça login novamente.");
    expect(mockedCreateClient).not.toHaveBeenCalled();
    expect(mockedTeamsClient).not.toHaveBeenCalled();
  });

  it("renders permission message when user cannot access teams module", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "unit_user",
    } as any);

    const element = await TeamsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Você não tem permissão para acessar este módulo");
    expect(mockedCreateClient).not.toHaveBeenCalled();
    expect(mockedTeamsClient).not.toHaveBeenCalled();
  });

  it("renders organization error when orgId is missing", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: null,
      platformRole: "platform_admin",
      orgRole: null,
    } as any);

    const element = await TeamsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain(
      "Não foi possível determinar a organização ativa para o seu usuário."
    );
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("renders teams query error message when teams fetch fails", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "platform_admin",
      orgRole: null,
    } as any);

    const teamsQuery = makeAwaitableQuery({
      data: null,
      error: { message: "Erro equipes" },
    });
    const usersQuery = makeAwaitableQuery({
      data: [],
      error: null,
    });

    const selectTeams = jest.fn(() => teamsQuery);
    const selectUsers = jest.fn(() => usersQuery);

    mockedCreateClient.mockReturnValue({
      from: (table: string) => {
        if (table === "equipes") return { select: selectTeams };
        return { select: selectUsers };
      },
    } as any);

    const element = await TeamsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Erro equipes");
    expect(mockedTeamsClient).not.toHaveBeenCalled();
  });

  it("renders users query error message when members fetch fails", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "platform_admin",
      orgRole: null,
    } as any);

    const teamsQuery = makeAwaitableQuery({
      data: [],
      error: null,
    });
    const usersQuery = makeAwaitableQuery({
      data: null,
      error: { message: "Erro membros" },
    });

    const selectTeams = jest.fn(() => teamsQuery);
    const selectUsers = jest.fn(() => usersQuery);

    mockedCreateClient.mockReturnValue({
      from: (table: string) => {
        if (table === "equipes") return { select: selectTeams };
        return { select: selectUsers };
      },
    } as any);

    const element = await TeamsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Erro membros");
    expect(mockedTeamsClient).not.toHaveBeenCalled();
  });

  it("builds teams payload and renders TeamsClient with enriched users", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "org_admin",
    } as any);

    const teamsQuery = makeAwaitableQuery({
      data: [
        {
          id: "team-1",
          name: "Equipe A",
          leader_user_id: "u1",
          updated_at: "2026-04-05T10:00:00.000Z",
          leader: { full_name: "Líder A", avatar_url: "leader-a.png" },
          members: [{ user_id: "u1" }, { user_id: "u2" }],
        },
        {
          id: "team-2",
          name: "Equipe B",
          leader_user_id: "u3",
          updated_at: null,
          leader: null,
          members: [{ user_id: "u9" }],
        },
      ],
      error: null,
    });
    const usersQuery = makeAwaitableQuery({
      data: [
        {
          user_id: "u2",
          role: "unit_user",
          profiles: { full_name: "Zeta", avatar_url: null },
        },
        {
          user_id: "u1",
          role: "org_admin",
          profiles: { full_name: "Ana", avatar_url: "ana.png" },
        },
      ],
      error: null,
    });

    const selectTeams = jest.fn(() => teamsQuery);
    const selectUsers = jest.fn(() => usersQuery);
    const from = jest.fn((table: string) => {
      if (table === "equipes") return { select: selectTeams };
      return { select: selectUsers };
    });

    mockedCreateClient.mockReturnValue({ from } as any);

    const usersAfterAuth = [
      {
        id: "u1",
        role: "org_admin",
        name: "Ana",
        email: "ana@example.com",
        avatarUrl: "ana.png",
        title: null,
      },
      {
        id: "u2",
        role: "unit_user",
        name: "Zeta",
        email: "zeta@example.com",
        avatarUrl: null,
        title: null,
      },
    ] as any;

    const usersAfterEmployee = [
      { ...usersAfterAuth[0], title: "Gerente" },
      { ...usersAfterAuth[1], title: "Analista" },
    ] as any;

    mockedEnrichOrgUsersWithAuthMetadata.mockResolvedValue(usersAfterAuth);
    mockedEnrichOrgUsersWithEmployeeProfile.mockResolvedValue(usersAfterEmployee);

    const element = await TeamsPage();
    renderToStaticMarkup(element as any);

    expect(from).toHaveBeenCalledWith("equipes");
    expect(from).toHaveBeenCalledWith("org_members");
    expect(teamsQuery.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(teamsQuery.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(usersQuery.eq).toHaveBeenCalledWith("org_id", "org-1");

    expect(mockedEnrichOrgUsersWithAuthMetadata).toHaveBeenCalledTimes(1);
    expect(mockedEnrichOrgUsersWithEmployeeProfile).toHaveBeenCalledTimes(1);
    expect(mockedEnrichOrgUsersWithEmployeeProfile).toHaveBeenCalledWith(
      usersAfterAuth
    );

    expect(mockedTeamsClient).toHaveBeenCalledTimes(1);
    const teamsClientProps = mockedTeamsClient.mock.calls[0][0];

    expect(teamsClientProps.canManage).toBe(true);
    expect(teamsClientProps.orgUsers).toEqual(usersAfterEmployee);
    expect(teamsClientProps.initialTeams).toEqual([
      {
        id: "team-1",
        name: "Equipe A",
        leaderId: "u1",
        leaderName: "Líder A",
        leaderAvatarUrl: "leader-a.png",
        membersCount: 2,
        members: [
          { id: "u1", name: "Ana", avatarUrl: "ana.png" },
          { id: "u2", name: "Zeta", avatarUrl: null },
        ],
        updatedAt: "2026-04-05T10:00:00.000Z",
      },
      {
        id: "team-2",
        name: "Equipe B",
        leaderId: "u3",
        leaderName: null,
        leaderAvatarUrl: null,
        membersCount: 1,
        members: [{ id: "u9", name: "Sem nome", avatarUrl: null }],
        updatedAt: null,
      },
    ]);
  });
});
