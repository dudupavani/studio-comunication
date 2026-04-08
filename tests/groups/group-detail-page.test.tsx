import { renderToStaticMarkup } from "react-dom/server";
import GroupPage from "@/app/(app)/groups/[groupId]/page";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/app/(app)/groups/[groupId]/MembersTable", () => ({
  __esModule: true,
  default: ({ rows }: any) => (
    <div data-testid="members-table">
      {JSON.stringify(rows)}
    </div>
  ),
}));

jest.mock("@/app/(app)/groups/[groupId]/AddMembersDrawer", () => ({
  __esModule: true,
  default: () => <div data-testid="add-members-drawer" />,
}));

jest.mock("@/components/groups/GroupColorSquare", () => ({
  __esModule: true,
  default: () => <div data-testid="group-color-square" />,
}));

jest.mock("@/components/groups/HeaderEditButton", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="header-edit-button">{children}</div>,
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedCreateServiceClient =
  createServiceClient as jest.MockedFunction<typeof createServiceClient>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;

function makeAwaitableQuery<T>(result: T) {
  const query: any = {
    from: jest.fn(() => query),
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    order: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    rpc: jest.fn(() => Promise.resolve(result)),
    then: (
      onFulfilled: (value: T) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return query;
}

describe("app/(app)/groups/[groupId]/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const params = { groupId: "group-1" };

  it("renders access denied when user is not authenticated", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    const element = await GroupPage({ params });
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Acesso negado: usuário não autenticado");
  });

  it("renders access denied when group belongs to another organization", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-MINE",
      platformRole: null,
    } as any);

    const groupQuery = makeAwaitableQuery({
      data: { id: "group-1", org_id: "org-OTHER" },
      error: null,
    });
    mockedCreateServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === "user_groups") return groupQuery;
        return makeAwaitableQuery({ data: [], error: null });
      },
    } as any);

    const element = await GroupPage({ params });
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Acesso negado: grupo não pertence à sua organização");
  });

  it("renders group details and members list", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "org_admin",
    } as any);

    mockedCreateServiceClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "user_groups") {
          return makeAwaitableQuery({
            data: {
              id: "group-1",
              org_id: "org-1",
              name: "Grupo Alfa",
              description: "Desc Alfa",
              color: "#ff0000",
            },
          });
        }
        if (table === "user_group_members") {
          return makeAwaitableQuery({
            data: [{ user_id: "u1", added_at: "2026-01-01" }],
            count: 1,
            error: null,
          });
        }
        if (table === "profiles") {
          return makeAwaitableQuery({
            data: [{ id: "u1", full_name: "Usuario Um", avatar_url: null }],
            error: null,
          });
        }
        if (table === "org_members") {
          return makeAwaitableQuery({
            data: [{ user_id: "u1", org_id: "org-1", role: "org_master" }],
            error: null,
          });
        }
        return makeAwaitableQuery({ data: [], error: null });
      }),
      rpc: jest.fn().mockResolvedValue({
        data: [{ user_id: "u1", full_name: "Usuario Um", email: "u1@ex.com" }],
        error: null,
      }),
    } as any);

    mockedCreateClient.mockReturnValue({
      from: jest.fn(() => makeAwaitableQuery({ data: null, error: null })),
    } as any);

    const element = await GroupPage({ params });
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Grupo Alfa");
    expect(html).toContain("Desc Alfa");
    expect(html).toContain("Usuario Um");
    expect(html).toContain("u1@ex.com");
    expect(html).toContain("Org Master"); // check role label
  });
});
