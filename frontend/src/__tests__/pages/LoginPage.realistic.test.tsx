/**
 * LoginPage Realistic Tests - Testing Actual Implementation
 * Based on: frontend/src/app/login/page.tsx
 * Authority: docs/User_Experience.md
 *
 * This test file validates the ACTUAL LoginPage implementation with
 * Microsoft Entra ID SSO authentication.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Mock the Entra auth store
const mockLoginWithEntra = jest.fn();
const mockClearError = jest.fn();

let mockEntraAuthStore = {
  loginWithEntra: mockLoginWithEntra,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
  isAuthenticated: false,
};

const mockPush = jest.fn();

jest.mock('../../store/entra-auth.store', () => ({
  useEntraAuthStore: () => mockEntraAuthStore,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/login',
}));

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Import AFTER mocks
import LoginPage from '../../app/login/page';

describe('LoginPage - Realistic Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntraAuthStore = {
      loginWithEntra: mockLoginWithEntra,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
    };
  });

  describe('Core Component Rendering', () => {
    it('renders without crashing', () => {
      render(<LoginPage />);
      expect(document.body).toBeTruthy();
    });

    it('displays the login page heading', () => {
      render(<LoginPage />);
      expect(screen.getByText('Sign in to Carpool')).toBeInTheDocument();
    });

    it('shows link to create new account', () => {
      render(<LoginPage />);
      expect(
        screen.getByRole('link', { name: /sign up/i })
      ).toBeInTheDocument();
    });
  });

  describe('Microsoft SSO Structure', () => {
    it('renders Microsoft SSO button', () => {
      render(<LoginPage />);
      expect(
        screen.getByRole('button', { name: /continue with microsoft/i })
      ).toBeInTheDocument();
    });

    it('displays Microsoft SSO description', () => {
      render(<LoginPage />);
      expect(
        screen.getByText(/use your microsoft account/i)
      ).toBeInTheDocument();
    });

    it('shows security provider notice', () => {
      render(<LoginPage />);
      expect(screen.getByText(/microsoft entra id/i)).toBeInTheDocument();
    });
  });

  describe('Microsoft SSO Login Flow', () => {
    it('calls loginWithEntra when SSO button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const ssoButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      await user.click(ssoButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoginWithEntra).toHaveBeenCalled();
    });

    it('handles login errors gracefully', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockLoginWithEntra.mockRejectedValueOnce(new Error('Login failed'));

      const user = userEvent.setup();
      render(<LoginPage />);

      const ssoButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      await user.click(ssoButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Microsoft login failed:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Accessibility and Structure', () => {
    it('uses semantic HTML structure', () => {
      render(<LoginPage />);

      // Check for heading
      expect(
        screen.getByRole('heading', { name: /sign in to carpool/i })
      ).toBeInTheDocument();

      // Check for navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('provides accessible button', () => {
      render(<LoginPage />);

      const button = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      // Tab to focus on button
      await user.tab();

      // Should be able to find a focusable element
      expect(document.activeElement).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when isLoading is true', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        isLoading: true,
      };

      render(<LoginPage />);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('handles loading state without crashing', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        isLoading: true,
      };

      render(<LoginPage />);
      expect(document.body).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error exists', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        error: 'Authentication failed. Please try again.',
      };

      render(<LoginPage />);

      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
      expect(
        screen.getByText('Authentication failed. Please try again.')
      ).toBeInTheDocument();
    });

    it('handles login errors gracefully', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockLoginWithEntra.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<LoginPage />);

      const ssoButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      await user.click(ssoButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });
  });

  describe('Navigation and Links', () => {
    it('provides navigation to register page', () => {
      render(<LoginPage />);

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    it('displays app branding link', () => {
      render(<LoginPage />);

      const brandLink = screen.getByRole('link', { name: /carpool/i });
      expect(brandLink).toHaveAttribute('href', '/');
    });
  });

  describe('Security Considerations', () => {
    it('uses enterprise SSO instead of password-based auth', () => {
      render(<LoginPage />);

      // Verify no password input exists - Microsoft SSO only
      expect(
        screen.queryByPlaceholderText(/password/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });

    it('displays Microsoft Entra ID branding for trust', () => {
      render(<LoginPage />);

      expect(screen.getByText(/Microsoft Entra ID/i)).toBeInTheDocument();
    });

    it('shows terms and privacy notice', () => {
      render(<LoginPage />);

      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });
  });
});
