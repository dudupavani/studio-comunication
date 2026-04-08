/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AddMembersDrawer from "@/app/(app)/groups/[groupId]/AddMembersDrawer";
import MembersTable from "@/app/(app)/groups/[groupId]/MembersTable";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

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

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mocks de ícones
jest.mock("lucide-react", () => ({
  CirclePlus: () => <span>Plus</span>,
  Trash2: () => <span>Trash</span>,
  Loader2: () => <span>Loader</span>,
  ArrowLeft: () => <span>Left</span>,
  ArrowRight: () => <span>Right</span>,
}));

// Mocks de UI
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open, onOpenChange }: any) => {
    const React = require("react");
    return <div data-testid="drawer-root">{
      React.Children.map(children, (child: any) => {
        if (!child) return null;
        return React.cloneElement(child, { open, onOpenChange });
      })
    }</div>;
  },
  DrawerTrigger: ({ children, onOpenChange }: any) => (
    <div onClick={() => onOpenChange(true)}>{children}</div>
  ),
  DrawerContent: ({ children, open }: any) => (open ? <div data-testid="drawer-content">{children}</div> : null),
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
  DrawerFooter: ({ children }: any) => <div>{children}</div>,
  DrawerDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => {
    const React = require("react");
    return <div data-testid="alert-dialog-root">{
      React.Children.map(children, (child: any) => {
        if (!child) return null;
        return React.cloneElement(child, { open, onOpenChange });
      })
    }</div>;
  },
  AlertDialogContent: ({ children, open }: any) => (open ? <div data-testid="alert-dialog-content">{children}</div> : null),
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, "aria-label": label }: any) => (
    <input type="checkbox" checked={checked || false} onChange={(e) => onCheckedChange(e.target.checked)} aria-label={label} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock("@/components/shared/user-summary", () => ({
  __esModule: true,
  default: ({ name }: any) => <div>{name}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

describe("Group Member Management", () => {
  const mockToast = jest.fn();
  const mockRouter = { refresh: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
  });

  describe("AddMembersDrawer", () => {
    it("opens and adds members successfully", async () => {
      const mockUsers = [
        { id: "u1", name: "User 1", cargo: "Dev", unitName: "Matriz", teamName: null },
      ];
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes("available-members")) {
          return Promise.resolve({ ok: true, json: async () => ({ users: mockUsers }) });
        }
        if (url.includes("members")) {
          return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<AddMembersDrawer groupId="g1" />);

      // Abrir o drawer
      fireEvent.click(screen.getByText(/adicionar membros/i));

      // Esperar carregar usuários
      await waitFor(() => {
        expect(screen.getByText("User 1")).toBeInTheDocument();
      });

      // Selecionar usuário
      const checkbox = screen.getByLabelText(/selecionar user 1/i);
      fireEvent.click(checkbox);

      // Enviar
      const addButton = screen.getByRole("button", { name: /^adicionar$/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/groups/g1/members", expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("u1"),
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Membros adicionados",
        }));
      });
    });
  });

  describe("MembersTable", () => {
    const mockRows = [
      { id: "u1", name: "User 1", email: "u1@test.com", avatarUrl: null, cargo: "Dev", unitName: "Matriz", roleLabel: "Admin", addedAt: new Date().toISOString() },
    ];

    it("removes a member successfully after confirmation", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<MembersTable groupId="g1" rows={mockRows} totalCount={1} />);

      // Clicar em remover
      const removeButton = screen.getByRole("button", { name: /trash/i });
      fireEvent.click(removeButton);

      // Confirmar no AlertDialog
      const alertDialog = screen.getByTestId("alert-dialog-content");
      const confirmButton = within(alertDialog).getByRole("button", { name: /remover/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/groups/g1/members", expect.objectContaining({
          method: "DELETE",
          body: expect.stringContaining("u1"),
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Usuário removido do grupo",
        }));
      });
    });
  });
});
