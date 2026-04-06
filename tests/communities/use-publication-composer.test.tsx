/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";

import { useToast } from "@/hooks/use-toast";
import { usePublicationComposer } from "@/app/(app)/comunidades/components/use-publication-composer";
import type { CommunityFeedItem } from "@/app/(app)/comunidades/components/types";

jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

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

describe("usePublicationComposer", () => {
  const toast = jest.fn();
  const onPublished = jest.fn();
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseToast.mockReturnValue({ toast } as any);
    (globalThis as any).fetch = fetchMock;
    if (typeof window !== "undefined") {
      (window as any).fetch = fetchMock;
    }
  });

  it("opens composer in create mode and adds a text block", () => {
    const { result } = renderHook(() =>
      usePublicationComposer({
        selectedCommunityId: "community-1",
        selectedSpaceId: "space-1",
      }),
    );

    act(() => {
      result.current.openCreatePublication();
      result.current.addTextBlock();
    });

    expect(result.current.createPublicationOpen).toBe(true);
    expect(result.current.composerMode).toBe("create");
    expect(result.current.publicationBlocks).toHaveLength(1);
    expect(result.current.publicationBlocks[0]).toMatchObject({
      type: "text",
      content: "",
    });
  });

  it("blocks publish when context is missing", async () => {
    const { result } = renderHook(() =>
      usePublicationComposer({
        selectedCommunityId: null,
        selectedSpaceId: null,
      }),
    );

    await act(async () => {
      result.current.openCreatePublication();
      result.current.setPublicationTitle("Título");
      await result.current.handlePublish();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Contexto indisponível" }),
    );
  });

  it("blocks publish when title is empty", async () => {
    const { result } = renderHook(() =>
      usePublicationComposer({
        selectedCommunityId: "community-1",
        selectedSpaceId: "space-1",
      }),
    );

    act(() => {
      result.current.openCreatePublication();
    });

    await waitFor(() => {
      expect(result.current.createPublicationOpen).toBe(true);
    });

    await act(async () => {
      result.current.setPublicationTitle("   ");
      await result.current.handlePublish();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Título obrigatório" }),
    );
  });

  it("publishes successfully and resets composer state", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      const method = init?.method ?? "GET";
      if (
        /^\/api\/communities\/community-1\/spaces\/space-1\/posts\/?$/.test(path) &&
        method === "POST"
      ) {
        return jsonResponse({
          item: { id: "post-1" },
        });
      }
      throw new Error(`Unexpected fetch ${method} ${path}`);
    });

    const { result } = renderHook(() =>
      usePublicationComposer({
        selectedCommunityId: "community-1",
        selectedSpaceId: "space-1",
        onPublished,
      }),
    );

    act(() => {
      result.current.openCreatePublication();
    });

    await waitFor(() => {
      expect(result.current.createPublicationOpen).toBe(true);
    });

    act(() => {
      result.current.setPublicationTitle("Primeira publicação");
      result.current.addTextBlock();
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    await waitFor(() => {
      expect(result.current.createPublicationOpen).toBe(false);
    });

    expect(result.current.publicationTitle).toBe("");
    expect(result.current.publicationBlocks).toHaveLength(0);
    expect(onPublished).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Publicação criada" }),
    );
  });

  it("loads publication in view mode and allows switching to edit mode", async () => {
    const item: CommunityFeedItem = {
      id: "post-1",
      communityId: "community-1",
      spaceId: "space-1",
      title: "Post",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (
        path === "/api/communities/community-1/spaces/space-1/posts/post-1"
      ) {
        return jsonResponse({
          item: {
            id: "post-1",
            title: "Post carregado",
            coverPath: null,
            coverUrl: null,
            blocks: [{ id: "b1", type: "text", content: "Conteúdo" }],
          },
        });
      }
      throw new Error(`Unexpected fetch ${path}`);
    });

    const { result } = renderHook(() =>
      usePublicationComposer({
        selectedCommunityId: "community-1",
        selectedSpaceId: "space-1",
      }),
    );

    await act(async () => {
      await result.current.openViewPublication(item);
    });

    expect(result.current.createPublicationOpen).toBe(true);
    expect(result.current.composerMode).toBe("view");
    expect(result.current.publicationTitle).toBe("Post carregado");
    expect(result.current.publicationBlocks).toHaveLength(1);

    act(() => {
      result.current.startEditingCurrentPublication();
    });

    expect(result.current.composerMode).toBe("edit");
  });
});
