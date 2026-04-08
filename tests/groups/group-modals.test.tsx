/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NewGroupModal from "@/components/groups/new-group-modal";
import EditGroupModal from "@/components/groups/edit-group-modal";
import { createGroupAction } from "@/app/(app)/groups/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Mocks de ícones
jest.mock("lucide-react", () => ({
  Plus: () => <span>Plus</span>,
  CirclePlus: () => <span>CirclePlus</span>,
  Pencil: () => <span>Pencil</span>,
  Info: () => <span>Info</span>,
}));
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

jest.mock("@/app/(app)/groups/actions", () => ({
  createGroupAction: jest.fn(),
}));

// Mock de UI
jest.mock("@/components/ui/dialog", () => {
  const React = require("react");
  return {
    Dialog: ({ children, open, onOpenChange }: any) => {
      // Se open estiver definido (controlled), usamos ele; caso contrário, simulamos internal state
      const [isOpen, setIsOpen] = React.useState(open || false);
      React.useEffect(() => { setIsOpen(open); }, [open]);

      // Passamos o estado e a função de mudança para os filhos que precisarem
      return <div data-testid="dialog-root">{
        React.Children.map(children, (child: any) => {
          if (!child) return null;
          return React.cloneElement(child, { 
            isOpen, 
            setIsOpen: (v: boolean) => {
              setIsOpen(v);
              onOpenChange?.(v);
            } 
          });
        })
      }</div>;
    },
    DialogTrigger: ({ children, setIsOpen }: any) => (
      <div onClick={() => setIsOpen(true)} data-testid="dialog-trigger">{children}</div>
    ),
    DialogContent: ({ children, isOpen }: any) => (
      isOpen ? <div data-testid="dialog-content">{children}</div> : null
    ),
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value || ""} onChange={onChange} {...props} />
  ),
}));

describe("Group Modals", () => {
  const mockToast = jest.fn();
  const mockRouter = { refresh: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = jest.fn();
  });

  describe("NewGroupModal", () => {
    it("renders and submits successfully", async () => {
      (createGroupAction as jest.Mock).mockResolvedValue({ ok: true });

      render(<NewGroupModal orgId="o1" onSubmit={createGroupAction} />);

      // Abrir o modal
      fireEvent.click(screen.getByText(/criar grupo/i));

      // Preencher campos
      fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Grupo Teste" } });
      fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: "Desc" } });

      // Enviar
      const submitButton = screen.getByRole("button", { name: /^criar$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(createGroupAction).toHaveBeenCalledWith(expect.objectContaining({
          name: "Grupo Teste",
          description: "Desc",
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Grupo criado",
        }));
      });
    });
  });

  describe("EditGroupModal", () => {
    const mockGroup = {
      id: "g1",
      orgId: "o1",
      name: "Grupo Antigo",
      description: "Desc Antiga",
      color: "#FF0000",
    };

    it("renders with initial data and updates successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(
        <EditGroupModal 
          open={true} 
          onOpenChange={jest.fn()} 
          group={mockGroup} 
        />
      );

      // Usar o id ou label agora que adicionamos
      const nameInput = screen.getByLabelText(/nome/i);
      expect(nameInput).toHaveValue("Grupo Antigo");

      // Alterar nome
      fireEvent.change(nameInput, { target: { value: "Grupo Novo" } });

      // Atualizar
      const updateButton = screen.getByRole("button", { name: /atualizar/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/groups/g1", expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("Grupo Novo"),
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Grupo atualizado",
        }));
      });
    });
  });
});
