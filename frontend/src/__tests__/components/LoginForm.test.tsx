/**
 * Tests for LoginForm Component
 * Testing Microsoft Entra ID SSO login functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LoginForm } from '../../components/auth/LoginForm';

// Mock the Entra auth store
const mockLoginWithEntra = jest.fn();
const mockClearError = jest.fn();

let mockEntraAuthStore = {
  loginWithEntra: mockLoginWithEntra,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
};

jest.mock('../../store/entra-auth.store', () => ({
  useEntraAuthStore: () => mockEntraAuthStore,
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntraAuthStore = {
      loginWithEntra: mockLoginWithEntra,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    };
  });

  describe('Form Rendering', () => {
    it('should render the login form with Microsoft SSO button', () => {
      render(<LoginForm />);

      expect(screen.getByText('Sign in to Carpool')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /continue with microsoft/i })
      ).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<LoginForm />);

      expect(
        screen.getByText(
          /Use your Microsoft account to access the carpool platform/i
        )
      ).toBeInTheDocument();
    });

    it('should render terms and security notice', () => {
      render(<LoginForm />);

      expect(
        screen.getByText(/By signing in, you agree to our terms of service/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Microsoft Entra ID/i)).toBeInTheDocument();
    });
  });

  describe('Microsoft SSO Login', () => {
    it('should call loginWithEntra when button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const ssoButton = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      await user.click(ssoButton);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockLoginWithEntra).toHaveBeenCalled();
    });

    it('should handle login errors gracefully', async () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockLoginWithEntra.mockRejectedValueOnce(new Error('Login failed'));

      const user = userEvent.setup();
      render(<LoginForm />);

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

  describe('Loading States', () => {
    it('should show loading state when isLoading is true', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        isLoading: true,
      };

      render(<LoginForm />);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show normal state when not loading', () => {
      render(<LoginForm />);

      expect(screen.getByText(/Continue with Microsoft/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        error: 'Authentication failed. Please try again.',
      };

      render(<LoginForm />);

      expect(screen.getByText('Sign in failed')).toBeInTheDocument();
      expect(
        screen.getByText('Authentication failed. Please try again.')
      ).toBeInTheDocument();
    });

    it('should not display error when error is null', () => {
      render(<LoginForm />);

      expect(screen.queryByText('Sign in failed')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button structure', () => {
      render(<LoginForm />);

      const button = screen.getByRole('button', {
        name: /continue with microsoft/i,
      });
      expect(button).toBeInTheDocument();
      // Button is clickable and properly styled
      expect(button).toHaveClass('bg-blue-600');
    });

    it('should have semantic heading', () => {
      render(<LoginForm />);

      const heading = screen.getByRole('heading', {
        name: /sign in to carpool/i,
      });
      expect(heading).toBeInTheDocument();
    });

    it('should disable button when loading to prevent multiple clicks', () => {
      mockEntraAuthStore = {
        ...mockEntraAuthStore,
        isLoading: true,
      };

      render(<LoginForm />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Security Considerations', () => {
    it('should use enterprise SSO instead of password-based auth', () => {
      render(<LoginForm />);

      // Verify no password input exists - Microsoft SSO only
      expect(
        screen.queryByPlaceholderText(/password/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });

    it('should display Microsoft Entra ID branding for trust', () => {
      render(<LoginForm />);

      expect(screen.getByText(/Microsoft Entra ID/i)).toBeInTheDocument();
    });
  });
});
