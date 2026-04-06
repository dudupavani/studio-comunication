/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useCommunitiesData } from "@/app/(app)/comunidades/components/use-communities-data";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseToast = useToast as jest.MockedFunction<typeof useToast>;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function requestPath(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return new URL(input, "http://localhost").pathname;
  }
  if (input instanceof URL) {
    return input.pathname;
  }
  return new URL(input.url, "http://localhost").pathname;
}

function extractCommunityId(path: string) {
  const match = path.match(/^\/api\/communities\/([^/]+)/);
  return match?.[1] ?? null;
}

describe("useCommunitiesData", () => {
  const push = jest.fn();
  const replace = jest.fn();
  const toast = jest.fn();
  const fetchMock = jest.fn();

  const communityList = [
    {
      id: "community-1",
      orgId: "org-1",
      name: "Comunidade 1",
      visibility: "global",
      segmentType: null,
      segmentTargetIds: [],
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      spacesCount: 1,
      canManage: true,
      canPost: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const detailByCommunityId: Record<string, any> = {
    "community-1": {
      ...communityList[0],
      spaces: [
        {
          id: "space-1",
          communityId: "community-1",
          orgId: "org-1",
          name: "Publicações",
          spaceType: "publicacoes",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    "community-2": {
      ...communityList[0],
      id: "community-2",
      name: "Comunidade 2",
      spaces: [
        {
          id: "space-2",
          communityId: "community-2",
          orgId: "org-1",
          name: "Publicações",
          spaceType: "publicacoes",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  };

  const feedByCommunityId: Record<string, any> = {
    "community-1": {
      communityId: "community-1",
      visibleSpaceIds: ["space-1"],
      items: [],
    },
    "community-2": {
      communityId: "community-2",
      visibleSpaceIds: ["space-2"],
      items: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      push,
      replace,
    } as any);
    mockedUseToast.mockReturnValue({ toast } as any);
    (globalThis as any).fetch = fetchMock;
    if (typeof window !== "undefined") {
      (window as any).fetch = fetchMock;
    }
  });

  it("loads communities and auto-selects the first community when no initial id", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/communities") {
        return jsonResponse({ items: communityList });
      }
      if (path.endsWith("/feed")) {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: feedByCommunityId[id] ?? feedByCommunityId["community-1"] });
      }
      if (path.startsWith("/api/communities/")) {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: detailByCommunityId[id] ?? detailByCommunityId["community-1"] });
      }
      throw new Error(`Unexpected fetch path ${path}`);
    });

    const { result } = renderHook(() => useCommunitiesData({}));

    await waitFor(() => {
      expect(result.current.communitiesLoading).toBe(false);
    });

    const calledPaths = fetchMock.mock.calls.map((args: any[]) =>
      requestPath(args[0]),
    );
    expect(calledPaths).toContain("/api/communities");

    await waitFor(() => {
      expect(result.current.selectedCommunityId).toBe("community-1");
    });

    expect(replace).toHaveBeenCalledWith("/comunidades/community-1");
    expect(result.current.communities).toHaveLength(1);
  });

  it("creates a community and navigates to the created resource", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      const method = init?.method ?? "GET";

      if (path === "/api/communities" && method === "GET") {
        return jsonResponse({
          items: [
            communityList[0],
            { ...communityList[0], id: "community-2", name: "Comunidade 2" },
          ],
        });
      }

      if (path === "/api/communities" && method === "POST") {
        return jsonResponse({
          item: {
            ...communityList[0],
            id: "community-2",
            name: "Comunidade 2",
          },
        });
      }

      if (path.endsWith("/feed")) {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: feedByCommunityId[id] ?? feedByCommunityId["community-1"] });
      }
      if (path.startsWith("/api/communities/")) {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: detailByCommunityId[id] ?? detailByCommunityId["community-1"] });
      }
      throw new Error(`Unexpected fetch ${method} ${path}`);
    });

    const { result } = renderHook(() =>
      useCommunitiesData({ initialCommunityId: "community-1" }),
    );

    await waitFor(() => {
      expect(result.current.communitiesLoading).toBe(false);
      expect(result.current.selectedCommunityId).toBe("community-1");
    });

    await act(async () => {
      await result.current.handleCreateCommunity({
        name: "Comunidade 2",
        visibility: "global",
        segmentType: null,
        segmentTargetIds: [],
        allowUnitMasterPost: true,
        allowUnitUserPost: false,
      });
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/comunidades/community-2");
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Comunidade criada" }),
    );
  });

  it("removes publication and reloads feed", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      const method = init?.method ?? "GET";

      if (path === "/api/communities" && method === "GET") {
        return jsonResponse({ items: communityList });
      }
      if (path.endsWith("/feed") && method === "GET") {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: feedByCommunityId[id] ?? feedByCommunityId["community-1"] });
      }
      if (path.startsWith("/api/communities/") && method === "GET") {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: detailByCommunityId[id] ?? detailByCommunityId["community-1"] });
      }
      if (
        path ===
          "/api/communities/community-1/spaces/space-1/posts/post-1" &&
        method === "DELETE"
      ) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected fetch ${method} ${path}`);
    });

    const { result } = renderHook(() =>
      useCommunitiesData({ initialCommunityId: "community-1" }),
    );

    await waitFor(() => {
      expect(result.current.communitiesLoading).toBe(false);
    });

    let deleted = false;
    await act(async () => {
      deleted = await result.current.handleDeletePublication({
        id: "post-1",
        communityId: "community-1",
        spaceId: "space-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });

    expect(deleted).toBe(true);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Publicação removida" }),
    );
    await waitFor(() => {
      expect(result.current.deletingPublicationId).toBeNull();
    });
  });

  it("falls back to /comunidades when detail loading fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === "/api/communities") {
        return jsonResponse({ items: communityList });
      }
      if (path.endsWith("/feed")) {
        const id = extractCommunityId(path) ?? "community-1";
        return jsonResponse({ item: feedByCommunityId[id] ?? feedByCommunityId["community-1"] });
      }
      if (path.startsWith("/api/communities/")) {
        return jsonResponse({ error: "boom" }, 500);
      }
      throw new Error(`Unexpected fetch path ${path}`);
    });

    const { result } = renderHook(() =>
      useCommunitiesData({ initialCommunityId: "community-1" }),
    );

    await waitFor(() => {
      expect(result.current.communitiesLoading).toBe(false);
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/comunidades");
    });

    expect(result.current.selectedCommunityId).toBeNull();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Falha ao carregar comunidade" }),
    );
  });
});
