/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { PublicationComposerModal } from "@/app/(app)/comunidades/components/publication-composer-modal";

// Mock de ícones para evitar erro de ESM do lucide-react no Jest
jest.mock("lucide-react", () => ({
  FileText: () => null,
  Heart: () => null,
  ImagePlus: () => null,
  MessageCircle: () => null,
  MoreHorizontal: () => null,
  Paperclip: () => null,
  Type: () => null,
  X: () => null,
}));

// Mock de componentes UI que podem ser complexos
jest.mock("@/components/ui/web-components/expandable-modal", () => ({
  ExpandableModal: ({ children, open, header, footer, onOpenChange }: any) => 
    open ? (
      <div data-testid="expandable-modal">
        <div>{header}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

describe("PublicationComposerModal Utilities", () => {
  const mockComposer = {
    createPublicationOpen: true,
    setCreatePublicationOpen: jest.fn(),
    isViewingPublication: true,
    isEditingPublication: false,
    activeFeedItem: {
      id: "p1",
      authorName: "João Silva",
      authorAvatarUrl: null,
      createdAt: "2026-04-06T12:00:00Z",
      reactions: [
        { emoji: "👍", count: 1, reacted: false, previewUsers: [{ id: "u1", name: "Maria" }] }
      ],
    },
    publicationBlocks: [],
    resetComposer: jest.fn(),
    addTextBlock: jest.fn(),
  } as any;

  const defaultProps = {
    composer: mockComposer,
    canManage: false,
    currentUserId: "user-123",
    onDeletePublication: jest.fn(),
    onToggleReaction: jest.fn(),
    onLoadReactionActors: jest.fn(),
    reactingPublicationId: null,
    deletingPublicationId: null,
  };

  it("formats author initials correctly (getInitials)", () => {
    render(<PublicationComposerModal {...defaultProps} />);
    
    // O fallback do avatar deve mostrar "JS" para "João Silva"
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("formats feed date correctly (formatFeedDate)", () => {
    render(<PublicationComposerModal {...defaultProps} />);
    
    // Intl.DateTimeFormat pode variar por ambiente, mas deve conter partes da data
    // Em pt-BR short date/time seria algo como "06/04/26 09:00" (dependendo do timezone do runner)
    // Vamos verificar se existe um padrão de data/hora
    const dateElement = screen.getByText(/[0-9]{2}\/[0-9]{2}\/[0-9]{2}/);
    expect(dateElement).toBeInTheDocument();
  });

  it("formats like count label correctly (formatLikeCountLabel)", () => {
    const { rerender } = render(<PublicationComposerModal {...defaultProps} />);
    
    expect(screen.getByText("1 curtida")).toBeInTheDocument();

    const pluralComposer = {
      ...mockComposer,
      activeFeedItem: {
        ...mockComposer.activeFeedItem,
        reactions: [{ emoji: "👍", count: 5, reacted: false, previewUsers: [] }]
      }
    };

    rerender(<PublicationComposerModal {...defaultProps} composer={pluralComposer} />);
    expect(screen.getByText("5 curtidas")).toBeInTheDocument();
  });

  it("shows 'Usuário sem nome' when authorName is missing", () => {
    const anonymousComposer = {
      ...mockComposer,
      activeFeedItem: {
        ...mockComposer.activeFeedItem,
        authorName: ""
      }
    };

    render(<PublicationComposerModal {...defaultProps} composer={anonymousComposer} />);
    expect(screen.getByText("Usuário sem nome")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument(); // Initials for empty name
  });
});
