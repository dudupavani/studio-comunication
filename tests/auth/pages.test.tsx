/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Mocks dos componentes de formulário
jest.mock("@/components/auth/login-form", () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

jest.mock("@/components/auth/forgot-password-form", () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form">Forgot Password Form</div>,
}));

jest.mock("@/components/auth/reset-password-form", () => ({
  ResetPasswordForm: () => <div data-testid="reset-password-form">Reset Password Form</div>,
}));

// Mock do supabase server client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock do next/navigation
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock do next/image e next/link
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("Auth Pages", () => {
  it("renders LoginPage with LoginForm", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
  });

  it("renders ForgotPasswordPage with ForgotPasswordForm", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
  });

  it("renders ResetPasswordPage with ResetPasswordForm", async () => {
    // Mock user being logged in
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "123" } }, error: null }),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Resolve o componente async para teste (em jsdom)
    const Page = await ResetPasswordPage();
    render(Page);
    
    expect(screen.getByTestId("reset-password-form")).toBeInTheDocument();
  });

  it("redirects ResetPasswordPage to login if no user", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    await ResetPasswordPage();
    
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
