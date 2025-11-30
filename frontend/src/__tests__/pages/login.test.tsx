/**
 * Integration tests for Login Page
 * Tests Microsoft Entra ID SSO implementation
 *
 * Updated to align with current implementation:
 * - Microsoft Entra ID single sign-on (SSO) only
 * - No email/password form (uses Microsoft authentication)
 * - Role-based dashboard navigation after auth
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import LoginPage from '../../app/login/page';

// Mock the Entra auth store
const mockLoginWithEntra = jest.fn();
const mockClearError = jest.fn();
const mockEntraAuthStore: {
  loginWithEntra: jest.Mock;
  isLoading: boolean;
  error: string | null;
  clearError: jest.Mock;
  vedUser: null;
  isAuthenticated: boolean;
} = {
  loginWithEntra: mockLoginWithEntra,
  isLoading: false,
  error: null,
  clearError: mockClearError,
  vedUser: null,
  isAuthenticated: false,
};

jest.mock('../../store/entra-auth.store', () => ({
  useEntraAuthStore: (selector?: any) =>
    selector ? selector(mockEntraAuthStore) : mockEntraAuthStore,
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Login Page - Microsoft Entra ID SSO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntraAuthStore.isLoading = false;
    mockEntraAuthStore.isAuthenticated = false;
    mockEntraAuthStore.error = null;
    mockEntraAuthStore.vedUser = null;
  });

  describe('Page Rendering', () => {
    it('should render login page with Microsoft SSO button', () => {
      render(<LoginPage />);

      // Check for heading
      expect(screen.getByText('Sign in to Carpool')).toBeInTheDocument();

      // Check for Microsoft login button
      expect(
        screen.getByRole('button', { name: /continue with microsoft/i })
      ).toBeInTheDocument();

      // Check for descriptive text
      expect(
        screen.getByText(/use your microsoft account to access/i)
      ).toBeInTheDocument();
    });

    it('should render navigation with sign up link', () => {
      render(<LoginPage />);

      // Check for navigation
      expect(screen.getByText('Carpool')).toBeInTheDocument();

      // Check for sign up link
      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    it('should have proper accessibility attributes', () => {
      render(<LoginPage />);

      const loginButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      expect(loginButton).toBeVisible();
      expect(loginButton).toBeEnabled();
    });
  });

  describe('Microsoft SSO Login Flow', () => {
    it('should call loginWithEntra when Microsoft button is clicked', async () => {
      const user = userEvent.setup();
      mockLoginWithEntra.mockResolvedValue(undefined);

      render(<LoginPage />);

      const loginButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
        expect(mockLoginWithEntra).toHaveBeenCalled();
      });
    });

    it('should show loading state while authenticating', () => {
      mockEntraAuthStore.isLoading = true;

      render(<LoginPage />);

      const loginButton = screen.getByRole('button', { name: /signing in/i });
      expect(loginButton).toBeDisabled();
    });

    it('should display error message when login fails', () => {
      mockEntraAuthStore.error = 'Authentication failed. Please try again.';

      render(<LoginPage />);

      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
      expect(
        screen.getByText('Authentication failed. Please try again.')
      ).toBeInTheDocument();
    });
  });

  describe('Navigation and Links', () => {
    it('should have working navigation to home', () => {
      render(<LoginPage />);

      const homeLink = screen.getByRole('link', { name: /carpool/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should have working navigation to registration', () => {
      render(<LoginPage />);

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Security and Compliance', () => {
    it('should display Microsoft Entra ID security notice', () => {
      render(<LoginPage />);

      expect(
        screen.getByText(
          /secure authentication provided by microsoft entra id/i
        )
      ).toBeInTheDocument();
    });

    it('should display terms of service notice', () => {
      render(<LoginPage />);

      expect(
        screen.getByText(/by signing in, you agree to our terms of service/i)
      ).toBeInTheDocument();
    });
  });
});
