/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { CommunitySwitcherRail } from "@/app/(app)/comunidades/components/community-switcher-rail";
import type { CommunityItem } from "@/app/(app)/comunidades/components/types";

jest.mock("lucide-react", () => ({
  Inbox: () => null,
  Plus: () => null,
}));

// Mock do next/image e next/link
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("CommunitySwitcherRail", () => {
  const mockOnSelectCommunity = jest.fn();
  const mockOnCreateCommunity = jest.fn();

  const communities: CommunityItem[] = [
    {
      id: "c1",
      name: "Alpha",
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
    },
    {
      id: "c2",
      name: "Beta",
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
    },
  ];

  const defaultProps = {
    communities,
    communitiesLoading: false,
    selectedCommunityId: "c1",
    canCreateCommunity: true,
    onSelectCommunity: mockOnSelectCommunity,
    onCreateCommunity: mockOnCreateCommunity,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the list of communities correctly", () => {
    render(<CommunitySwitcherRail {...defaultProps} />);
    
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // Verifica iniciais
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("calls onSelectCommunity when a community is clicked", () => {
    render(<CommunitySwitcherRail {...defaultProps} />);
    
    const betaButton = screen.getByLabelText(/abrir comunidade Beta/i);
    fireEvent.click(betaButton);

    expect(mockOnSelectCommunity).toHaveBeenCalledWith("c2");
  });

  it("shows the create community button when canCreateCommunity is true", () => {
    const { rerender } = render(<CommunitySwitcherRail {...defaultProps} canCreateCommunity={true} />);
    
    const createButton = screen.getByRole("button", { name: /criar comunidade/i });
    expect(createButton).toBeInTheDocument();
    
    fireEvent.click(createButton);
    expect(mockOnCreateCommunity).toHaveBeenCalledTimes(1);

    rerender(<CommunitySwitcherRail {...defaultProps} canCreateCommunity={false} />);
    expect(screen.queryByRole("button", { name: /criar comunidade/i })).not.toBeInTheDocument();
  });

  it("highlights the selected community", () => {
    render(<CommunitySwitcherRail {...defaultProps} selectedCommunityId="c1" />);
    
    const alphaInitial = screen.getByText("A");
    expect(alphaInitial).toHaveClass("bg-zinc-900");

    const betaInitial = screen.getByText("B");
    expect(betaInitial).toHaveClass("bg-zinc-700");
  });

  it("renders loading skeletons when communitiesLoading is true", () => {
    const { container } = render(<CommunitySwitcherRail {...defaultProps} communitiesLoading={true} />);
    
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("renders management links", () => {
    render(<CommunitySwitcherRail {...defaultProps} />);
    
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inbox/i })).toHaveAttribute("href", "/inbox");
  });
});
