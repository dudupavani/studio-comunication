/** @jest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommunityCreateWizard } from "@/app/(app)/comunidades/components/community-create-wizard";
import { useToast } from "@/hooks/use-toast";

// Mock do useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

// Mock do fetch global
global.fetch = jest.fn();

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe("CommunityCreateWizard", () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
  });

  it("renders step 1 initially and requires a name to advance", () => {
    render(
      <CommunityCreateWizard
        submitting={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Dê um nome para a sua comunidade")).toBeInTheDocument();
    
    const advanceButton = screen.getByRole("button", { name: /avançar/i });
    expect(advanceButton).toBeDisabled();

    const nameInput = screen.getByLabelText(/dê um nome para a sua comunidade/i);
    fireEvent.change(nameInput, { target: { value: "Minha Comunidade" } });

    expect(advanceButton).not.toBeDisabled();
  });

  it("advances to step 2 when clicking advance with a name", async () => {
    render(
      <CommunityCreateWizard
        submitting={false}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/dê um nome para a sua comunidade/i);
    fireEvent.change(nameInput, { target: { value: "Minha Comunidade" } });
    
    const advanceButton = screen.getByRole("button", { name: /avançar/i });
    fireEvent.click(advanceButton);

    await waitFor(() => {
      expect(screen.getByText("Segmentação da audiência")).toBeInTheDocument();
    });
  });

  it("submits correct payload for global visibility when no segments are selected", async () => {
    render(
      <CommunityCreateWizard
        submitting={false}
        onSubmit={mockOnSubmit}
      />
    );

    // Step 1
    const nameInput = screen.getByLabelText(/dê um nome para a sua comunidade/i);
    fireEvent.change(nameInput, { target: { value: "Minha Comunidade" } });
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));

    // Step 2
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /criar comunidade/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /criar comunidade/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: "Minha Comunidade",
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      visibility: "global",
      segmentType: null,
      segmentTargetIds: [],
    });
  });

  it("loads and displays segment options in step 2", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("groups")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [{ id: "g1", name: "Grupo 1" }] }),
        });
      }
      if (url.includes("teams")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [{ id: "t1", name: "Equipe 1" }] }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(
      <CommunityCreateWizard
        submitting={false}
        onSubmit={mockOnSubmit}
      />
    );

    // Avançar para o step 2
    fireEvent.change(screen.getByLabelText(/dê um nome para a sua comunidade/i), {
      target: { value: "Comu Teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));

    await waitFor(() => {
      expect(screen.getByText("Grupo de usuário")).toBeInTheDocument();
    });

    // Abrir o MultiSelect de Grupos
    const groupSelect = screen.getByRole("button", { name: /selecione o\(os\) grupo\(os\)/i });
    fireEvent.click(groupSelect);

    await waitFor(() => {
      expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    });
  });

  it("submits correct payload with segmented visibility when a group is selected", async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("groups")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ items: [{ id: "g1", name: "Grupo 1" }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [] }),
      });
    });

    render(
      <CommunityCreateWizard
        submitting={false}
        onSubmit={mockOnSubmit}
      />
    );

    // Step 1
    fireEvent.change(screen.getByLabelText(/dê um nome para a sua comunidade/i), {
      target: { value: "Comu Segmentada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));

    // Step 2 - Selecionar Grupo
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /selecione o\(os\) grupo\(os\)/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /selecione o\(os\) grupo\(os\)/i }));
    
    await waitFor(() => {
      const option = screen.getByText("Grupo 1");
      fireEvent.click(option);
    });

    // Fechar popover clicando fora ou verificando se o badge apareceu (o badge é renderizado no botão)
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /criar comunidade/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: "Comu Segmentada",
      visibility: "segmented",
      segmentType: "group",
      segmentTargetIds: ["g1"],
    }));
  });
});
