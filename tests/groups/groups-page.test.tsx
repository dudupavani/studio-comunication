import { renderToStaticMarkup } from "react-dom/server";
import GroupsPage from "@/app/(app)/groups/page";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/components/groups/new-group-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="new-group-modal" />,
}));

jest.mock("@/components/groups/GroupColorSquare", () => ({
  __esModule: true,
  default: () => <div data-testid="group-color-square" />,
}));

jest.mock("@/components/ui/empty", () => ({
  Empty: ({ children }: any) => <div data-testid="empty">{children}</div>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyMedia: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <div>{children}</div>,
  EmptyDescription: ({ children }: any) => <div>{children}</div>,
  EmptyContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

function makeAwaitableQuery<T>(result: T) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
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

describe("app/(app)/groups/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login message when user is not authenticated", async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const element = await GroupsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Faça login para ver os grupos");
  });

  it("renders organization error when org_members fetch fails", async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "org_members") {
          return makeAwaitableQuery({ data: null, error: { message: "DB Error" } });
        }
        return makeAwaitableQuery({ data: [], error: null });
      }),
    } as any);

    const element = await GroupsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Erro ao obter organização");
  });

  it("renders empty state when no groups exist", async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "org_members") {
          return makeAwaitableQuery({ data: { org_id: "org-1" }, error: null });
        }
        if (table === "user_groups") {
          return makeAwaitableQuery({ data: [], error: null });
        }
        return makeAwaitableQuery({ data: [], error: null });
      }),
    } as any);

    const element = await GroupsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Ainda não existem grupos");
  });

  it("renders list of groups when data is present", async () => {
    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "org_members") {
          return makeAwaitableQuery({ data: { org_id: "org-1" }, error: null });
        }
        if (table === "user_groups") {
          return makeAwaitableQuery({
            data: [
              {
                id: "group-1",
                name: "Grupo Alfa",
                description: "Desc Alfa",
                color: "#ff0000",
                user_group_members: [{ count: 5 }],
              },
            ],
            error: null,
          });
        }
        return makeAwaitableQuery({ data: [], error: null });
      }),
    } as any);

    const element = await GroupsPage();
    const html = renderToStaticMarkup(element as any);

    expect(html).toContain("Grupo Alfa");
    expect(html).toContain("Desc Alfa");
    expect(html).toContain("5"); // member count
  });
});
