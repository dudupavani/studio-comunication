/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { updatePassword } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";

// Mock das actions
jest.mock("@/lib/actions/auth", () => ({
  updatePassword: jest.fn(),
}));

// Mock do useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

// Mock do next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("ResetPasswordForm", () => {
  const mockToast = jest.fn();
  (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders reset password form", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("shows error if passwords don't match", async () => {
    render(<ResetPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "mismatch" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  it("calls updatePassword on valid submission", async () => {
    (updatePassword as jest.Mock).mockResolvedValue({ error: null });
    
    render(<ResetPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: "new-password-123" } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Success",
      }));
    });
  });
});
