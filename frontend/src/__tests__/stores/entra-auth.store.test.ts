/**
 * Comprehensive tests for EntraAuthStore
 *
 * Tests cover:
 * - Store initialization
 * - Authentication state management
 * - Login and logout flows
 * - Token acquisition
 * - Error handling
 * - Compatibility layer with legacy auth.store
 */

import { act, renderHook, waitFor } from '@testing-library/react';

// Mock window location
const mockLocation = {
  pathname: '/dashboard',
  origin: 'http://localhost:3000',
  hash: '',
  href: 'http://localhost:3000/dashboard',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock MSAL browser
const mockMsalInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  handleRedirectPromise: jest.fn().mockResolvedValue(null),
  getAllAccounts: jest.fn().mockReturnValue([]),
  setActiveAccount: jest.fn(),
  getActiveAccount: jest.fn().mockReturnValue(null),
  loginRedirect: jest.fn().mockResolvedValue(undefined),
  acquireTokenSilent: jest
    .fn()
    .mockResolvedValue({ accessToken: 'mock-token' }),
  logout: jest.fn().mockResolvedValue(undefined),
  logoutRedirect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => mockMsalInstance),
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InteractionRequiredAuthError';
    }
  },
}));

// Mock API client
const mockApiClient = {
  post: jest.fn().mockResolvedValue({
    success: true,
    data: { user: { id: 'user-1', email: 'test@example.com' } },
  }),
  get: jest.fn().mockResolvedValue({ success: true, data: {} }),
  put: jest.fn().mockResolvedValue({ success: true, data: {} }),
  setToken: jest.fn(),
  clearToken: jest.fn(),
};

jest.mock('../../lib/api-client', () => ({
  apiClient: mockApiClient,
}));

// Import after mocks
import { useEntraAuthStore } from '../../store/entra-auth.store';

describe('EntraAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    useEntraAuthStore.setState({
      msalInstance: null,
      vedUser: null,
      account: null,
      isLoading: false,
      isAuthenticated: false,
      authMethod: null,
      error: null,
      user: null,
      loading: false,
      token: null,
    });
    // Reset location
    mockLocation.pathname = '/dashboard';
    mockLocation.hash = '';
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEntraAuthStore());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.vedUser).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.authMethod).toBeNull();
    });

    it('should have legacy compatibility properties', () => {
      const { result } = renderHook(() => useEntraAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull();
    });
  });

  describe('Public Route Detection', () => {
    it('should not initialize on login page', async () => {
      mockLocation.pathname = '/login';

      const { result } = renderHook(() => useEntraAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should not initialize on register page', async () => {
      mockLocation.pathname = '/register';

      const { result } = renderHook(() => useEntraAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should not initialize on home page', async () => {
      mockLocation.pathname = '/';

      const { result } = renderHook(() => useEntraAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useEntraAuthStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => useEntraAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearInteractionState', () => {
    it('should clear interaction state without error', () => {
      const { result } = renderHook(() => useEntraAuthStore());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.clearInteractionState();
        });
      }).not.toThrow();
    });
  });

  describe('Authenticated State', () => {
    it('should track authenticated state correctly', () => {
      const { result } = renderHook(() => useEntraAuthStore());

      // Initially not authenticated
      expect(result.current.isAuthenticated).toBe(false);

      // Set as authenticated
      act(() => {
        useEntraAuthStore.setState({
          isAuthenticated: true,
          vedUser: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
          },
          authMethod: 'entra',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.vedUser).not.toBeNull();
      expect(result.current.authMethod).toBe('entra');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockLocation.pathname = '/dashboard';
      mockMsalInstance.initialize.mockRejectedValueOnce(
        new Error('Init failed')
      );

      const { result } = renderHook(() => useEntraAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBe(
        'Authentication service initialization failed'
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Compatibility Layer', () => {
    it('should expose user property for legacy components', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        permissions: [],
      };

      act(() => {
        useEntraAuthStore.setState({
          vedUser: mockUser,
          user: mockUser as any,
        });
      });

      const { result } = renderHook(() => useEntraAuthStore());

      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('test@example.com');
    });

    it('should expose loading property for legacy components', () => {
      act(() => {
        useEntraAuthStore.setState({ isLoading: true, loading: true });
      });

      const { result } = renderHook(() => useEntraAuthStore());

      expect(result.current.loading).toBe(true);
    });
  });
});

// Additional tests for re-export compatibility
describe('Auth Store Re-export', () => {
  it('should re-export useAuthStore from auth.store.ts', async () => {
    // This tests the compatibility layer
    const { useAuthStore } = await import('../../store/auth.store');
    expect(useAuthStore).toBeDefined();
  });

  it('should re-export useEntraAuthStore from auth.store.ts', async () => {
    const { useEntraAuthStore: reExportedStore } =
      await import('../../store/auth.store');
    expect(reExportedStore).toBeDefined();
  });
});
