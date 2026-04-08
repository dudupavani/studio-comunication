/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { CommunitySidebar } from "@/app/(app)/comunidades/components/community-sidebar";
import type { CommunityDetail, CommunityItem } from "@/app/(app)/comunidades/components/types";

jest.mock("lucide-react", () => ({
  MoreVertical: () => null,
  Plus: () => null,
  Rss: () => null,
  SquareMenu: () => null,
}));

describe("CommunitySidebar", () => {
  const mockNavigateToFeed = jest.fn();
  const mockNavigateToSpace = jest.fn();
  const mockOpenCreateSpace = jest.fn();

  const defaultProps = {
    activeCommunity: {
      id: "c1",
      name: "Comunidade 1",
      orgId: "org1",
      visibility: "global",
      segmentType: null,
      segmentTargetIds: [],
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      spacesCount: 0,
      canManage: true,
      canPost: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as CommunityItem,
    selectedCommunityId: "c1",
    selectedSpaceId: null,
    detailLoading: false,
    communityDetail: {
      id: "c1",
      name: "Comunidade 1",
      orgId: "org1",
      visibility: "global",
      segmentType: null,
      segmentTargetIds: [],
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      canManage: true,
      canPost: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spaces: [
        { id: "s1", communityId: "c1", orgId: "org1", name: "Geral", spaceType: "publicacoes", createdAt: "", updatedAt: "" },
        { id: "s2", communityId: "c1", orgId: "org1", name: "Anúncios", spaceType: "publicacoes", createdAt: "", updatedAt: "" },
        { id: "s3", communityId: "c1", orgId: "org1", name: "Webinars", spaceType: "eventos", createdAt: "", updatedAt: "" },
      ],
    } as CommunityDetail,
    canManage: true,
    onNavigateToFeed: mockNavigateToFeed,
    onNavigateToSpace: mockNavigateToSpace,
    onOpenCreateSpace: mockOpenCreateSpace,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeletons when detailLoading is true", () => {
    const { container } = render(<CommunitySidebar {...defaultProps} detailLoading={true} />);
    
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Publicações")).not.toBeInTheDocument();
  });

  it("groups spaces by type correctly", () => {
    render(<CommunitySidebar {...defaultProps} />);

    expect(screen.getByText("Publicações")).toBeInTheDocument();
    expect(screen.getByText("Eventos")).toBeInTheDocument();

    expect(screen.getByText("Geral")).toBeInTheDocument();
    expect(screen.getByText("Anúncios")).toBeInTheDocument();
    expect(screen.getByText("Webinars")).toBeInTheDocument();
  });

  it("calls onNavigateToFeed when Feed button is clicked", () => {
    render(<CommunitySidebar {...defaultProps} />);
    
    const feedButton = screen.getByRole("button", { name: /feed/i });
    fireEvent.click(feedButton);

    expect(mockNavigateToFeed).toHaveBeenCalledTimes(1);
  });

  it("calls onNavigateToSpace when a space is clicked", () => {
    render(<CommunitySidebar {...defaultProps} />);
    
    const spaceButton = screen.getByText("Geral");
    fireEvent.click(spaceButton);

    expect(mockNavigateToSpace).toHaveBeenCalledWith("s1");
  });

  it("shows create space button only when canManage is true", () => {
    const { rerender } = render(<CommunitySidebar {...defaultProps} canManage={true} />);
    
    expect(screen.getByLabelText(/criar espaço em publicações/i)).toBeInTheDocument();

    rerender(<CommunitySidebar {...defaultProps} canManage={false} />);
    expect(screen.queryByLabelText(/criar espaço em publicações/i)).not.toBeInTheDocument();
  });

  it("displays empty state message when no community is selected", () => {
    render(
      <CommunitySidebar
        {...defaultProps}
        activeCommunity={null}
        selectedCommunityId={null}
        communityDetail={{ spaces: [] } as any} // Passar objeto com spaces: [] para evitar erro de .filter em undefined
      />
    );

    expect(screen.getByText("Selecione uma comunidade para ver os espaços.")).toBeInTheDocument();
  });

  it("highlights the selected space", () => {
    render(<CommunitySidebar {...defaultProps} selectedSpaceId="s1" />);
    
    const spaceButton = screen.getByText("Geral").closest("button");
    expect(spaceButton).toHaveClass("bg-muted");

    const feedButton = screen.getByRole("button", { name: /feed/i });
    expect(feedButton).not.toHaveClass("bg-primary");
  });
});
