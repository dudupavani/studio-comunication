/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { CommunityContentPane } from "@/app/(app)/comunidades/components/community-content-pane";

jest.mock("lucide-react", () => ({
  ChevronDown: () => null,
  Heart: () => null,
  MessageCircle: () => null,
  MoreHorizontal: () => null,
  Rss: () => null,
  SquareMenu: () => null,
  X: () => null,
}));

function makeProps(overrides: Partial<ComponentProps<typeof CommunityContentPane>> = {}) {
  const onViewPublication = jest.fn().mockResolvedValue(undefined);

  const baseProps: ComponentProps<typeof CommunityContentPane> = {
    detailLoading: false,
    feedLoading: false,
    communityDetail: {
      id: "community-1",
      orgId: "org-1",
      name: "Comunidade 1",
      visibility: "global" as const,
      segmentType: null,
      segmentTargetIds: [],
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      canManage: true,
      canPost: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      spaces: [
        {
          id: "space-1",
          communityId: "community-1",
          orgId: "org-1",
          name: "Publicações",
          spaceType: "publicacoes" as const,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
    feedItems: [],
    selectedSpace: null,
    canManage: true,
    selectedCommunityId: "community-1",
    currentUserId: "user-1",
    communitiesCount: 1,
    onOpenSelector: jest.fn(),
    onEditCommunity: jest.fn(),
    onDeleteCommunity: jest.fn(),
    onEditSpace: jest.fn(),
    onDeleteSpace: jest.fn(),
    onCreateSpace: jest.fn(),
    onNavigateToSpace: jest.fn(),
    onOpenCreatePublication: jest.fn(),
    onViewPublication,
    onEditPublication: jest.fn().mockResolvedValue(undefined),
    onDeletePublication: jest.fn().mockResolvedValue(true),
    onToggleReaction: jest.fn().mockResolvedValue(true),
    onLoadReactionActors: jest.fn().mockResolvedValue([]),
    reactingPublicationId: null,
    deletingPublicationId: null,
  };

  return {
    ...baseProps,
    ...overrides,
  };
}

describe("CommunityContentPane", () => {
  it("renders empty selection state when no community is selected", () => {
    render(
      <CommunityContentPane
        {...makeProps({
          communityDetail: null,
          selectedCommunityId: null,
        })}
      />,
    );

    expect(screen.getByText("Selecione uma comunidade")).toBeInTheDocument();
  });

  it("enables creating publication in publication spaces", async () => {
    const user = userEvent.setup();
    const onOpenCreatePublication = jest.fn();

    render(
      <CommunityContentPane
        {...makeProps({
          selectedSpace: {
            id: "space-1",
            communityId: "community-1",
            orgId: "org-1",
            name: "Publicações",
            spaceType: "publicacoes" as const,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          onOpenCreatePublication,
        })}
      />,
    );

    const button = screen.getByRole("button", { name: "Nova publicação" });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(onOpenCreatePublication).toHaveBeenCalledTimes(1);
  });

  it("opens publication view when a feed item is clicked", async () => {
    const user = userEvent.setup();
    const onViewPublication = jest.fn().mockResolvedValue(undefined);

    render(
      <CommunityContentPane
        {...makeProps({
          selectedSpace: null,
          feedItems: [
            {
              id: "post-1",
              communityId: "community-1",
              spaceId: "space-1",
              title: "Postagem importante",
              excerpt: "Resumo da postagem",
              createdAt: "2026-01-01T10:00:00.000Z",
            },
          ],
          onViewPublication,
        })}
      />,
    );

    await user.click(screen.getByText("Postagem importante"));

    expect(onViewPublication).toHaveBeenCalledTimes(1);
    expect(onViewPublication).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
    );
  });

  it("edits publication from card actions without forcing view mode", async () => {
    const user = userEvent.setup();
    const onViewPublication = jest.fn().mockResolvedValue(undefined);
    const onEditPublication = jest.fn().mockResolvedValue(undefined);

    render(
      <CommunityContentPane
        {...makeProps({
          selectedSpace: null,
          feedItems: [
            {
              id: "post-1",
              communityId: "community-1",
              spaceId: "space-1",
              authorId: "user-1",
              authorName: "Autor",
              title: "Postagem importante",
              excerpt: "Resumo da postagem",
              createdAt: "2026-01-01T10:00:00.000Z",
            },
          ],
          onViewPublication,
          onEditPublication,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ações da publicação" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    expect(onEditPublication).toHaveBeenCalledTimes(1);
    expect(onViewPublication).not.toHaveBeenCalled();
  });
});
