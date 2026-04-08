/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";
import { signIn } from "@/lib/actions/auth";
import { useToast } from "@/hooks/use-toast";

// Mock das actions
jest.mock("@/lib/actions/auth", () => ({
  signIn: jest.fn(),
}));

// Mock do useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(),
}));

describe("LoginForm", () => {
  const mockToast = jest.fn();
  (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders login form fields", () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("shows validation errors for invalid input", async () => {
    render(<LoginForm />);
    
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/insira um e-mail válido/i)).toBeInTheDocument();
      expect(screen.getByText(/senha obrigatória/i)).toBeInTheDocument();
    });
  });

  it("calls signIn with form data on successful submission", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: null });
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });

    const formData = (signIn as jest.Mock).mock.calls[0][0];
    expect(formData.get("email")).toBe("user@example.com");
    expect(formData.get("password")).toBe("password123");
  });

  it("shows error toast if signIn fails", async () => {
    (signIn as jest.Mock).mockResolvedValue({ error: "Invalid credentials" });
    
    render(<LoginForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        variant: "destructive",
        title: "Error logging in",
        description: "Invalid credentials",
      }));
    });
  });
});
