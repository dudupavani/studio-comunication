/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DisableUserDialog from "@/components/users/disable-user-dialog";
import EnableUserDialog from "@/components/users/enable-user-dialog";
import DeleteUserDialog from "@/components/users/delete-user-dialog";
import { useToast } from "@/hooks/use-toast";

// Mock do toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

// Mock do utils/cn
jest.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.join(" "),
}));

// Mock do lucide-react
jest.mock("lucide-react", () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  Trash: () => <span>Trash</span>,
  UserCheck: () => <span>UserCheck</span>,
  UserX: () => <span>UserX</span>,
}));

// Mock do Dialog do shadcn
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div className="gap-1">{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock do next/navigation (router.refresh)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

// Mock do fetch
global.fetch = jest.fn();

const mockToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ toast: mockToast });

describe("User Lifecycle Dialogs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DisableUserDialog", () => {
    it("calls disable API and shows toast on success", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<DisableUserDialog userId="u1" userName="João" />);
      
      const confirmButton = screen.getAllByRole("button", { name: /^Desativar$/i }).pop();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/users/u1/disable", expect.any(Object));
        expect(mockToast).toHaveBeenCalled();
      });
    });
  });

  describe("EnableUserDialog", () => {
    it("calls enable API and shows toast on success", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<EnableUserDialog userId="u1" userName="João" />);
      
      const confirmButton = screen.getAllByRole("button", { name: /^Ativar$/i }).pop();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/users/u1/enable", expect.any(Object));
        expect(mockToast).toHaveBeenCalled();
      });
    });
  });

  describe("DeleteUserDialog", () => {
    it("calls delete API and shows toast on success", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      render(<DeleteUserDialog userId="u1" userName="João" />);
      
      const confirmButton = screen.getAllByRole("button", { name: /^Remover$/i }).pop();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/u1", expect.any(Object));
        expect(mockToast).toHaveBeenCalled();
      });
    });
  });
});
