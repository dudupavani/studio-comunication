/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditUserForm from "@/components/users/edit-user-form";
import { useToast } from "@/hooks/use-toast";
import { updateUserRoles } from "@/lib/actions/user";

// Mocks de infraestrutura
jest.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.join(" "),
}));

jest.mock("tailwind-merge", () => ({
  twMerge: (...args: any[]) => args.join(" "),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

jest.mock("@/lib/actions/user", () => ({
  updateUserRoles: jest.fn(),
}));

// Mocks de UI
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange }: any) => (
    <input 
      type="date" 
      value={value || ""} 
      onChange={(e) => onChange(e.target.value)} 
      data-testid="date-picker" 
    />
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// Mocks de ícones
jest.mock("lucide-react", () => ({
  InfoIcon: () => <span>Info</span>,
}));

const mockUnits = [{ id: "un1", name: "Unidade 1" }];
const mockTeams = [{ id: "tm1", name: "Equipe 1" }];

describe("EditUserForm", () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    global.fetch = jest.fn();
  });

  it("renders with default values", () => {
    render(
      <EditUserForm 
        userId="u1" 
        orgId="o1" 
        defaultName="João Silva"
        defaultCargo="Analista"
        units={mockUnits}
        teams={mockTeams}
        currentRole="unit_user"
        currentUnitId="un1"
      />
    );

    expect(screen.getByDisplayValue("João Silva")).toBeDisabled();
    expect(screen.getByDisplayValue("Analista")).toBeInTheDocument();
    
    const selects = screen.getAllByTestId("select");
    expect(selects[0].value).toBe("unit_user");
    expect(selects[1].value).toBe("un1");
  });

  it("submits the form successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    (updateUserRoles as jest.Mock).mockResolvedValue({ ok: true });

    render(
      <EditUserForm 
        userId="u1" 
        orgId="o1" 
        defaultName="João Silva"
        units={mockUnits}
        teams={mockTeams}
        currentRole="unit_user"
        currentUnitId="un1"
      />
    );

    // Alterar cargo
    const cargoInput = screen.getByLabelText(/cargo/i);
    fireEvent.change(cargoInput, { target: { value: "Senior Analista" } });

    // Enviar
    const submitButton = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/users/u1/employee", expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Senior Analista"),
      }));
      expect(updateUserRoles).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Colaborador atualizado",
      }));
    });
  });

  it("shows error toast if save fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Erro de API" }),
    });

    render(
      <EditUserForm 
        userId="u1" 
        orgId="o1" 
        units={mockUnits}
        teams={mockTeams}
        currentRole="unit_user"
      />
    );

    const submitButton = screen.getByRole("button", { name: /salvar/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Erro de API",
      }));
    });
  });
});
