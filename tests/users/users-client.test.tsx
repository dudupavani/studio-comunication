/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsersClient from "@/components/users/users-client";
import { useRouter, useSearchParams } from "next/navigation";

// Mocks de navegação
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock do tailwind-merge
jest.mock("tailwind-merge", () => ({
  twMerge: (...args: any[]) => args.join(" "),
}));

// Mock do utils/cn
jest.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.join(" "),
}));

// Mocks de ícones
jest.mock("lucide-react", () => ({
  ListFilter: () => <span>Filter</span>,
  X: () => <span>X</span>,
  UserRoundX: () => <span>NoUsers</span>,
  MoreHorizontal: () => <span>More</span>,
  Pencil: () => <span>Edit</span>,
  UserX: () => <span>Disable</span>,
  UserCheck: () => <span>Enable</span>,
  Trash: () => <span>Delete</span>,
  List: () => <span>List</span>,
  LayoutGrid: () => <span>Grid</span>,
}));

// Mocks de UI simplificados
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

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div data-testid="filter-sheet">{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>{children}</button>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <div onClick={onSelect}>{children}</div>
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

// Mocks de subcomponentes do domínio para isolar o ambiente
jest.mock("@/components/users/new-user-modal", () => ({
  __esModule: true,
  default: () => <div data-testid="new-user-modal">NewUserModal</div>,
}));

jest.mock("@/components/users/disable-user-dialog", () => ({
  __esModule: true,
  default: () => <div data-testid="disable-dialog">DisableDialog</div>,
}));

jest.mock("@/components/users/enable-user-dialog", () => ({
  __esModule: true,
  default: () => <div data-testid="enable-dialog">EnableDialog</div>,
}));

jest.mock("@/components/users/delete-user-dialog", () => ({
  __esModule: true,
  default: () => <div data-testid="delete-dialog">DeleteDialog</div>,
}));

jest.mock("@/components/EmailCopy", () => ({
  __esModule: true,
  default: () => <div data-testid="email-copy">EmailCopy</div>,
}));

jest.mock("@/components/shared/user-summary", () => ({
  __esModule: true,
  default: ({ name }: any) => <div data-testid="user-summary">{name}</div>,
}));

const mockUsers = [
  { 
    id: "1", 
    full_name: "User Active", 
    email: "active@ex.com", 
    org_role: "org_admin", 
    disabled: false,
    unit_names: ["Unidade A"]
  },
  { 
    id: "2", 
    full_name: "User Disabled", 
    email: "disabled@ex.com", 
    org_role: "unit_user", 
    disabled: true,
    unit_names: ["Unidade B"]
  }
];

describe("UsersClient", () => {
  const mockRouter = { push: jest.fn() };
  const mockSearchParams = { get: jest.fn(), toString: () => "" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it("renders the list of users correctly", () => {
    render(
      <UsersClient 
        initialUsers={mockUsers} 
        authContext={{ orgId: "o1", orgRole: "org_admin" }}
        canPlatform={false}
        roleFilter={null}
      />
    );

    // Usa getAllByText pois renderiza tabela (desktop) e cards (mobile)
    expect(screen.getAllByText("User Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("User Disabled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ativo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Desativado").length).toBeGreaterThan(0);
  });

  it("filters users by status", async () => {
    render(
      <UsersClient 
        initialUsers={mockUsers} 
        authContext={{ orgId: "o1", orgRole: "org_admin" }}
        canPlatform={false}
        roleFilter={null}
      />
    );

    const selects = screen.getAllByTestId("select");
    const statusSelect = selects[1]; 

    fireEvent.change(statusSelect, { target: { value: "disabled" } });

    await waitFor(() => {
      expect(screen.getAllByText("User Disabled").length).toBeGreaterThan(0);
      expect(screen.queryByText("User Active")).not.toBeInTheDocument();
    });
  });

  it("filters users by unit", async () => {
    render(
      <UsersClient 
        initialUsers={mockUsers} 
        authContext={{ orgId: "o1", orgRole: "org_admin" }}
        canPlatform={false}
        roleFilter={null}
      />
    );

    const selects = screen.getAllByTestId("select");
    const unitSelect = selects[2]; 

    fireEvent.change(unitSelect, { target: { value: "Unidade A" } });

    await waitFor(() => {
      expect(screen.getAllByText("User Active").length).toBeGreaterThan(0);
      expect(screen.queryByText("User Disabled")).not.toBeInTheDocument();
    });
  });

  it("clears filters when clear button is clicked", async () => {
    render(
      <UsersClient 
        initialUsers={mockUsers} 
        authContext={{ orgId: "o1", orgRole: "org_admin" }}
        canPlatform={false}
        roleFilter={null}
      />
    );

    const selects = screen.getAllByTestId("select");
    fireEvent.change(selects[1], { target: { value: "disabled" } });

    const clearButton = screen.getByText("Limpar filtros");
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getAllByText("User Active").length).toBeGreaterThan(0);
      expect(screen.getAllByText("User Disabled").length).toBeGreaterThan(0);
    });
  });
});
