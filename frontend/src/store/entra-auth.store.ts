import { create } from 'zustand';
import {
  PublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { VedUser } from '@carpool/shared';
import { apiClient } from '../lib/api-client';

// MSAL Configuration following Apps_Auth_Requirement.md
const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/vedid.onmicrosoft.com',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

interface EntraAuthState {
  msalInstance: PublicClientApplication | null;
  vedUser: VedUser | null;
  account: AccountInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMethod: 'entra' | 'legacy' | null;
  error: string | null;
}

interface EntraAuthActions {
  initialize: () => Promise<void>;
  loginWithEntra: () => Promise<void>;
  loginWithLegacy: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  acquireTokenSilently: () => Promise<string | null>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

type EntraAuthStore = EntraAuthState & EntraAuthActions;

export const useEntraAuthStore = create<EntraAuthStore>()((set, get) => ({
  // State
  msalInstance: null,
  vedUser: null,
  account: null,
  isLoading: false,
  isAuthenticated: false,
  authMethod: null,
  error: null,

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Only initialize MSAL in browser environment
      if (typeof window === 'undefined') {
        set({ isLoading: false });
        return;
      }

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      set({ msalInstance, isLoading: false });

      // Check if user is already authenticated
      await get().checkAuthStatus();
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      set({
        error: 'Authentication service initialization failed',
        isLoading: false,
      });
    }
  },

  loginWithEntra: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      throw new Error('MSAL not initialized');
    }

    try {
      set({ isLoading: true, error: null });

      // Perform interactive login
      const loginResponse = await msalInstance.loginRedirect(loginRequest);

      // The redirect will reload the page, so this won't execute
      // The auth status will be checked on page load via checkAuthStatus
    } catch (error) {
      console.error('Entra login failed:', error);
      set({
        error: 'Microsoft sign-in failed. Please try again.',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithLegacy: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post<{
        user: any;
        token: string;
        refreshToken: string;
      }>('/auth-login-simple', {
        email,
        password,
      });

      if (response.success && response.data) {
        // Convert legacy user to VedUser format
        const legacyUser = response.data.user;
        const vedUser: VedUser = {
          id: legacyUser.id,
          email: legacyUser.email,
          name: `${legacyUser.firstName} ${legacyUser.lastName}`,
          firstName: legacyUser.firstName,
          lastName: legacyUser.lastName,
          permissions: [], // Map from legacy role
          vedProfile: {
            phoneNumber: legacyUser.phoneNumber,
            homeAddress: legacyUser.homeAddress,
            emergencyContact: legacyUser.emergencyContact,
            role: legacyUser.role,
            preferences: legacyUser.preferences,
            isActiveDriver: legacyUser.isActiveDriver,
            travelSchedule: legacyUser.travelSchedule,
          },
        };

        // Set token in API client
        apiClient.setToken(response.data.token, response.data.refreshToken);

        set({
          vedUser,
          isAuthenticated: true,
          authMethod: 'legacy',
          isLoading: false,
        });
      } else {
        throw new Error(response.error || 'Legacy login failed');
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    const { msalInstance, authMethod } = get();

    try {
      set({ isLoading: true });

      if (authMethod === 'entra' && msalInstance) {
        // MSAL logout
        await msalInstance.logoutRedirect();
      } else {
        // Legacy logout
        apiClient.clearToken();
      }

      set({
        vedUser: null,
        account: null,
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ isLoading: false });
    }
  },

  acquireTokenSilently: async (): Promise<string | null> => {
    const { msalInstance, account } = get();
    if (!msalInstance || !account) {
      return null;
    }

    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Require user interaction to get token
        try {
          await msalInstance.acquireTokenRedirect({
            ...loginRequest,
            account,
          });
        } catch (redirectError) {
          console.error('Token acquisition redirect failed:', redirectError);
        }
      }
      return null;
    }
  },

  checkAuthStatus: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      return;
    }

    try {
      const accounts = msalInstance.getAllAccounts();

      if (accounts.length > 0) {
        const account = accounts[0];

        // Try to get access token silently
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account,
        });

        if (tokenResponse.accessToken) {
          // Authenticate with backend using Entra token
          const response = await apiClient.post('/auth-entra-unified', {
            authProvider: 'entra',
            accessToken: tokenResponse.accessToken,
          });

          if (response.success && response.data) {
            const vedUser = (response.data as { user: VedUser }).user;

            set({
              vedUser,
              account,
              isAuthenticated: true,
              authMethod: 'entra',
              isLoading: false,
            });

            // Set token for API calls
            apiClient.setToken(tokenResponse.accessToken);
          }
        }
      } else {
        // No accounts found, check for legacy authentication
        // This would check for existing tokens in secure storage
        // and validate them with the backend
        set({
          isAuthenticated: false,
          authMethod: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      set({
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Export the MSAL instance for use in components
export { msalConfig, loginRequest };
