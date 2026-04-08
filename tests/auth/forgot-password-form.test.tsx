/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { sendPasswordResetEmail } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";

// Mock das actions
jest.mock("@/lib/actions/auth", () => ({
  sendPasswordResetEmail: jest.fn(),
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

describe("ForgotPasswordForm", () => {
  const mockToast = jest.fn();
  (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders forgot password form", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
  });

  it("calls sendPasswordResetEmail on successful submission", async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValue({ error: null });
    
    render(<ForgotPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Check your email",
      }));
    });
  });

  it("shows error toast if request fails", async () => {
    (sendPasswordResetEmail as jest.Mock).mockResolvedValue({ error: "Rate limit exceeded" });
    
    render(<ForgotPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        variant: "destructive",
        description: "Rate limit exceeded",
      }));
    });
  });
});
