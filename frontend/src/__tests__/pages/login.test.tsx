/**
 * Integration tests for Login Page
 * Tests real implementation with React Hook Form, Zod validation, and auth store
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import LoginPage from "../../app/login/page";

// Mock the auth store
const mockLogin = jest.fn();
const mockAuthStore = {
  login: mockLogin,
  isLoading: false,
  user: null,
  isAuthenticated: false,
};

jest.mock("../../store/auth.store", () => ({
  useAuthStore: (selector: any) => selector(mockAuthStore),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthStore.isLoading = false;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.user = null;
  });

  describe("Page Rendering", () => {
    it("should render login form with all elements", () => {
      render(<LoginPage />);

      // Check for heading
      expect(screen.getByText("Sign in to your account")).toBeInTheDocument();

      // Check for form inputs (by placeholder since labels are screen-reader only)
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();

      // Check for submit button
      expect(
        screen.getByRole("button", { name: /sign in/i })
      ).toBeInTheDocument();

      // Check for registration link
      expect(screen.getByText("create a new account")).toBeInTheDocument();
    });

    it("should have proper input types and attributes", () => {
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText("Password");

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("autoComplete", "email");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("autoComplete", "current-password");
    });
  });

  describe("Form Submission", () => {
    it("should submit form with valid credentials", async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText("Email address");
      const passwordInput = screen.getByPlaceholderText("Password");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "admin@vcarpool.com");
      await user.type(passwordInput, "Admin123!");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "admin@vcarpool.com",
          password: "Admin123!",
        });
      });
    });

    it("should handle empty form submission", async () => {
      const user = userEvent.setup();

      render(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      // Should not call login with empty form (form validation should prevent it)
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe("Loading States", () => {
    it("should show loading state when isLoading is true", () => {
      mockAuthStore.isLoading = true;

      render(<LoginPage />);

      const submitButton = screen.getByRole("button");
      expect(submitButton).toHaveTextContent("Signing in...");
      expect(submitButton).toBeDisabled();
    });

    it("should show normal state when not loading", () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole("button");
      expect(submitButton).toHaveTextContent("Sign in");
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("Navigation Links", () => {
    it("should have registration link", () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole("link", {
        name: /create a new account/i,
      });
      expect(registerLink).toHaveAttribute("href", "/register");
    });

    it("should have forgot password link", () => {
      render(<LoginPage />);

      const forgotPasswordLink = screen.getByRole("link", {
        name: /forgot your password/i,
      });
      expect(forgotPasswordLink).toHaveAttribute("href", "/forgot-password");
    });
  });
});
