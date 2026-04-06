/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";

import CommunitiesModule from "@/app/(app)/comunidades/components/communities-module";
import { useCommunitiesData } from "@/app/(app)/comunidades/components/use-communities-data";
import { usePublicationComposer } from "@/app/(app)/comunidades/components/use-publication-composer";

const mockCommunityContentPane = jest.fn((_props: any) => (
  <div data-testid="community-content-pane" />
));

jest.mock("@/app/(app)/comunidades/components/community-content-pane", () => ({
  CommunityContentPane: (props: any) => mockCommunityContentPane(props),
}));

jest.mock("@/app/(app)/comunidades/components/community-create-wizard", () => ({
  CommunityCreateWizard: () => <div data-testid="community-create-wizard" />,
}));

jest.mock("@/app/(app)/comunidades/components/community-form-dialog", () => ({
  CommunityFormDialog: () => <div data-testid="community-form-dialog" />,
}));

jest.mock(
  "@/app/(app)/comunidades/components/community-selection-dialog",
  () => ({
    CommunitySelectionDialog: () => (
      <div data-testid="community-selection-dialog" />
    ),
  }),
);

jest.mock("@/app/(app)/comunidades/components/community-sidebar", () => ({
  CommunitySidebar: () => <div data-testid="community-sidebar" />,
}));

jest.mock(
  "@/app/(app)/comunidades/components/community-workspace-header",
  () => ({
    CommunityWorkspaceHeader: () => (
      <div data-testid="community-workspace-header" />
    ),
  }),
);

jest.mock(
  "@/app/(app)/comunidades/components/destructive-confirmation-dialog",
  () => ({
    DestructiveConfirmationDialog: () => (
      <div data-testid="destructive-confirmation-dialog" />
    ),
  }),
);

jest.mock(
  "@/app/(app)/comunidades/components/publication-composer-modal",
  () => ({
    PublicationComposerModal: () => (
      <div data-testid="publication-composer-modal" />
    ),
  }),
);

jest.mock("@/app/(app)/comunidades/components/space-form-dialog", () => ({
  SpaceFormDialog: () => <div data-testid="space-form-dialog" />,
}));

jest.mock(
  "@/app/(app)/comunidades/components/use-communities-data",
  () => ({
    useCommunitiesData: jest.fn(),
  }),
);

jest.mock(
  "@/app/(app)/comunidades/components/use-publication-composer",
  () => ({
    usePublicationComposer: jest.fn(),
  }),
);

const mockedUseCommunitiesData =
  useCommunitiesData as jest.MockedFunction<typeof useCommunitiesData>;
const mockedUsePublicationComposer =
  usePublicationComposer as jest.MockedFunction<typeof usePublicationComposer>;

function makeCommunitiesData(overrides: Record<string, unknown> = {}) {
  return {
    communities: [
      {
        id: "community-1",
        name: "Comunidade 1",
      },
    ],
    communitiesLoading: false,
    reloadCommunityFeed: jest.fn(),
    selectedCommunityId: "community-1",
    selectedSpaceId: "space-1",
    communityDetail: {
      id: "community-1",
      name: "Comunidade 1",
      canPost: true,
      spaces: [
        {
          id: "space-1",
          name: "Publicações",
          spaceType: "publicacoes",
        },
      ],
    },
    detailLoading: false,
    communityFeed: {
      items: [
        { id: "post-1", spaceId: "space-1" },
        { id: "post-2", spaceId: "space-2" },
      ],
    },
    feedLoading: false,
    selectorOpen: false,
    setSelectorOpen: jest.fn(),
    communityDialogMode: null,
    setCommunityDialogMode: jest.fn(),
    spaceDialogMode: null,
    setSpaceDialogMode: jest.fn(),
    savingCommunity: false,
    savingSpace: false,
    confirmDeleteCommunityOpen: false,
    setConfirmDeleteCommunityOpen: jest.fn(),
    confirmDeleteSpaceOpen: false,
    setConfirmDeleteSpaceOpen: jest.fn(),
    deletingCommunity: false,
    deletingSpace: false,
    deletingPublicationId: null,
    selectedSpace: {
      id: "space-1",
      name: "Publicações",
      spaceType: "publicacoes",
    },
    activeCommunity: { id: "community-1", name: "Comunidade 1" },
    navigateToCommunity: jest.fn(),
    navigateToFeed: jest.fn(),
    navigateToSpace: jest.fn(),
    handleCreateCommunity: jest.fn(),
    handleUpdateCommunity: jest.fn(),
    handleDeleteCommunity: jest.fn(),
    handleCreateSpace: jest.fn(),
    handleUpdateSpace: jest.fn(),
    handleDeleteSpace: jest.fn(),
    handleDeletePublication: jest.fn(),
    communityDialogInitialValue: undefined,
    spaceDialogInitialValue: undefined,
    ...overrides,
  } as any;
}

describe("CommunitiesModule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePublicationComposer.mockReturnValue({
      openCreatePublication: jest.fn(),
      openViewPublication: jest.fn(),
      openEditPublication: jest.fn(),
    } as any);
  });

  it("opens create wizard when there are no communities and user can manage", async () => {
    mockedUseCommunitiesData.mockReturnValue(
      makeCommunitiesData({
        communities: [],
        communitiesLoading: false,
      }),
    );

    render(
      <CommunitiesModule
        canManage
        canCreateCommunity
        user={{ id: "user-1" } as any}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("community-create-wizard")).toBeInTheDocument();
    });
  });

  it("passes filtered feed items to content pane when a publication space is selected", () => {
    mockedUseCommunitiesData.mockReturnValue(makeCommunitiesData());

    render(
      <CommunitiesModule
        canManage={false}
        canCreateCommunity={false}
        user={{ id: "user-1" } as any}
      />,
    );

    expect(screen.getByTestId("community-content-pane")).toBeInTheDocument();
    const lastCall = mockCommunityContentPane.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const props = lastCall![0] as any;
    expect(props.feedItems).toHaveLength(1);
    expect(props.feedItems[0]).toMatchObject({ id: "post-1" });
  });
});
