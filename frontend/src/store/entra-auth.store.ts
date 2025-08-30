import { create } from 'zustand';
import {
  PublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { VedUser } from '@carpool/shared';
import { apiClient } from '../lib/api-client';

// MSAL Configuration following Apps_Auth_Requirement.md - CORRECTED
const msalConfig = {
  auth: {
    clientId:
      process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ||
      process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID ||
      '',
    authority:
      process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY ||
      process.env.NEXT_PUBLIC_ENTRA_AUTHORITY ||
      'https://login.microsoftonline.com/vedid.onmicrosoft.com',
    redirectUri:
      process.env.NEXT_PUBLIC_REDIRECT_URI ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : ''),
    postLogoutRedirectUri:
      process.env.NEXT_PUBLIC_APP_BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : ''),
  },
  cache: {
    cacheLocation: 'localStorage' as const, // CRITICAL FIX: Changed from sessionStorage to localStorage for SSO
    storeAuthStateInCookie: true, // CRITICAL FIX: Required for Safari and cross-domain
  },
};

const loginRequest = {
  scopes: ['User.Read'], // Start with just basic Microsoft Graph scope
};

interface EntraAuthState {
  msalInstance: PublicClientApplication | null;
  vedUser: VedUser | null;
  account: AccountInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authMethod: 'entra' | null;
  error: string | null;
}

interface EntraAuthActions {
  initialize: () => Promise<void>;
  handleAuthRedirect: () => Promise<void>;
  loginWithEntra: () => Promise<void>;
  logout: () => Promise<void>;
  acquireTokenSilently: () => Promise<string | null>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
  clearInteractionState: () => void;
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
      // CRITICAL SAFEGUARD: Never initialize auth on registration pages
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isRegistrationPage =
          pathname === '/register' ||
          pathname.startsWith('/register/') ||
          pathname === '/registration-complete' ||
          pathname.startsWith('/registration-complete');

        if (isRegistrationPage) {
          console.log(
            '🚫 BLOCKED: Auth initialization prevented on registration page:',
            pathname
          );
          set({ isLoading: false });
          return;
        }
      }

      set({ isLoading: true, error: null });

      // Only initialize MSAL in browser environment
      if (typeof window === 'undefined') {
        set({ isLoading: false });
        return;
      }

      console.log('Initializing MSAL...');
      console.log('Current URL:', window.location.href);
      console.log('URL hash:', window.location.hash);
      console.log('MSAL Config:', {
        clientId: msalConfig.auth.clientId,
        authority: msalConfig.auth.authority,
        redirectUri: msalConfig.auth.redirectUri,
      });

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      console.log('MSAL initialized successfully');

      set({ msalInstance });

      // Clear any previous interaction state on fresh page loads
      try {
        // This is safe to call - it clears any stuck interaction state
        const accounts = msalInstance.getAllAccounts();
        console.log('Found accounts:', accounts.length);

        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
          console.log('Set active account:', accounts[0].username);
        }
      } catch (clearError) {
        console.warn('Could not clear interaction state:', clearError);
      }

      // Check if we're coming back from a redirect first
      const isRedirectCallback =
        window.location.hash.includes('code=') ||
        window.location.hash.includes('access_token=') ||
        window.location.hash.includes('error=');

      if (isRedirectCallback) {
        console.log('Detected redirect callback, processing...');
        await get().handleAuthRedirect();
      } else {
        console.log(
          'No redirect callback detected, checking existing auth status...'
        );
        await get().checkAuthStatus();
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      set({
        error: 'Authentication service initialization failed',
        isLoading: false,
      });
    }
  },

  handleAuthRedirect: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      console.error('MSAL instance not available');
      return;
    }

    try {
      set({ isLoading: true, error: null });

      console.log('Handling auth redirect...');
      const response = await msalInstance.handleRedirectPromise();
      console.log('Redirect response:', response);

      if (response && response.accessToken) {
        console.log('Processing successful redirect response');
        console.log('Access token length:', response.accessToken.length);

        // Successful login redirect - exchange token with backend using unified auth endpoint
        const apiResponse = await apiClient.post('/auth', {
          action: 'entra-login',
          authProvider: 'entra',
          accessToken: response.accessToken,
        });

        console.log('Backend auth response:', apiResponse);

        if (apiResponse.success && apiResponse.data) {
          const vedUser = (apiResponse.data as { user: VedUser }).user;

          set({
            vedUser,
            account: response.account,
            isAuthenticated: true,
            authMethod: 'entra',
            isLoading: false,
          });

          // Set token for API calls
          apiClient.setToken(response.accessToken);

          // Clear the URL hash to remove auth parameters
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );

          // Redirect to dashboard after successful auth
          console.log('Redirecting to dashboard...');
          window.location.href = '/dashboard';
          return;
        } else {
          console.error('Backend auth failed:', apiResponse);
          set({
            error: 'Authentication with backend failed',
            isLoading: false,
          });
        }
      } else if (response === null) {
        console.log(
          'No response from handleRedirectPromise - this might be normal'
        );

        // Check if there are auth parameters but no response
        if (window.location.hash.includes('code=')) {
          console.warn('Auth code detected but no MSAL response');

          // Try a different approach - force process the hash
          setTimeout(async () => {
            try {
              console.log('Retrying redirect handling...');
              const retryResponse = await msalInstance.handleRedirectPromise();
              if (retryResponse) {
                console.log('Retry successful:', retryResponse);
                await get().handleAuthRedirect();
              } else {
                console.error('Retry also returned null');
                set({
                  error: 'Failed to process authentication response',
                  isLoading: false,
                });
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              set({
                error: 'Failed to process authentication response',
                isLoading: false,
              });
            }
          }, 500);
        } else {
          set({ isLoading: false });
        }
      } else {
        console.log('Unexpected response format:', response);
        set({
          error: 'Unexpected authentication response',
          isLoading: false,
        });
      }
    } catch (redirectError) {
      console.error('Error handling redirect:', redirectError);
      set({
        error: 'Failed to process authentication response',
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

      console.log('🔐 Starting Microsoft authentication...');

      // Debug current state
      const allAccounts = msalInstance.getAllAccounts();
      const activeAccount = msalInstance.getActiveAccount();
      console.log('📊 MSAL State:', {
        allAccountsCount: allAccounts.length,
        hasActiveAccount: !!activeAccount,
        activeAccountId: activeAccount?.localAccountId || 'none',
      });

      // If user is already authenticated, redirect to dashboard
      if (activeAccount && allAccounts.length > 0) {
        console.log(
          '✅ User already authenticated, redirecting to dashboard...'
        );
        set({
          account: activeAccount,
          isAuthenticated: true,
          authMethod: 'entra',
          isLoading: false,
        });
        window.location.href = '/dashboard';
        return;
      }

      console.log('🚀 Starting Microsoft redirect...');

      // Start the login redirect - this should navigate to Microsoft
      await msalInstance.loginRedirect(loginRequest);

      console.log(
        '⚠️ loginRedirect completed - this should not be reached if redirect worked'
      );
    } catch (error: any) {
      console.error('❌ Microsoft login failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        errorCode: error.errorCode,
        errorDesc: error.errorDesc,
      });

      set({
        error: `Microsoft sign-in failed: ${error.message || 'Unknown error'}`,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    const { msalInstance } = get();

    try {
      set({ isLoading: true });

      // Microsoft Entra ID logout with proper cleanup
      if (msalInstance) {
        // Clear MSAL cache completely
        await msalInstance.clearCache();

        // MSAL logout with domain-wide cleanup
        const logoutRequest = {
          postLogoutRedirectUri:
            process.env.NEXT_PUBLIC_APP_BASE_URL || window.location.origin,
        };

        await msalInstance.logoutRedirect(logoutRequest);
      }

      // Clear domain-wide authentication state
      try {
        // Clear localStorage for domain-wide SSO
        localStorage.removeItem('msal.interaction.status');
        localStorage.removeItem('msal.request.state');

        // Clear any domain cookies if present
        if (typeof document !== 'undefined') {
          document.cookie =
            'auth_token=; Domain=.vedprakash.net; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie =
            'refresh_token=; Domain=.vedprakash.net; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      } catch (cleanupError) {
        console.warn('Cleanup warning (non-blocking):', cleanupError);
      }

      // Clear API client token
      apiClient.clearToken();

      set({
        vedUser: null,
        account: null,
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      set({
        isLoading: false,
        error: 'Logout failed. Please try refreshing the page.',
      });
    }
  },

  acquireTokenSilently: async (): Promise<string | null> => {
    const { msalInstance, account } = get();
    if (!msalInstance || !account) {
      console.warn(
        'acquireTokenSilently: MSAL instance or account not available'
      );
      return null;
    }

    try {
      console.log('Attempting silent token acquisition...');
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
        forceRefresh: false, // Allow cache usage
      });

      console.log('Silent token acquisition successful');

      // PHASE 4 ENHANCEMENT: Validate token before returning
      if (response.accessToken) {
        // Set token for immediate use
        apiClient.setToken(response.accessToken);
        return response.accessToken;
      } else {
        console.warn('Token response missing access token');
        return null;
      }
    } catch (error) {
      console.error('Silent token acquisition failed:', error);

      if (error instanceof InteractionRequiredAuthError) {
        // PHASE 4 ENHANCEMENT: Graceful fallback for interaction required
        console.log(
          'Interaction required for token refresh - redirecting to login'
        );

        try {
          // Set loading state during redirect
          set({ isLoading: true, error: null });

          await msalInstance.acquireTokenRedirect({
            ...loginRequest,
            account,
          });

          // This won't execute due to redirect, but good practice
          return null;
        } catch (redirectError) {
          console.error('Token acquisition redirect failed:', redirectError);
          set({
            error: 'Authentication session expired. Please sign in again.',
            isLoading: false,
            isAuthenticated: false,
          });
          return null;
        }
      } else {
        // Other types of errors
        console.error('Non-interaction token error:', error);
        set({
          error: 'Token refresh failed. Please try signing in again.',
        });
        return null;
      }
    }
  },

  checkAuthStatus: async () => {
    const { msalInstance } = get();
    if (!msalInstance) {
      console.warn('checkAuthStatus: MSAL instance not available');
      return;
    }

    try {
      console.log('Checking authentication status...');
      const accounts = msalInstance.getAllAccounts();
      console.log(`Found ${accounts.length} accounts`);

      if (accounts.length > 0) {
        const account = accounts[0];
        console.log('Active account found:', account.username);

        try {
          // PHASE 4 ENHANCEMENT: Try to get access token silently with better error handling
          const tokenResponse = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account,
            forceRefresh: false,
          });

          if (tokenResponse.accessToken) {
            console.log('Valid token acquired, authenticating with backend...');

            // PHASE 4 ENHANCEMENT: Enhanced backend authentication with retry logic
            let authAttempts = 0;
            const maxRetries = 2;

            while (authAttempts < maxRetries) {
              try {
                const response = await apiClient.post('/auth', {
                  action: 'entra-login',
                  authProvider: 'entra',
                  accessToken: tokenResponse.accessToken,
                });

                if (response.success && response.data) {
                  const vedUser = (response.data as { user: VedUser }).user;

                  console.log(
                    'Backend authentication successful for user:',
                    vedUser.email
                  );

                  set({
                    vedUser,
                    account,
                    isAuthenticated: true,
                    authMethod: 'entra',
                    isLoading: false,
                    error: null,
                  });

                  // Set token for API calls
                  apiClient.setToken(tokenResponse.accessToken);
                  return; // Success, exit function
                } else {
                  throw new Error('Backend authentication response invalid');
                }
              } catch (backendError) {
                authAttempts++;
                console.error(
                  `Backend auth attempt ${authAttempts} failed:`,
                  backendError
                );

                if (authAttempts >= maxRetries) {
                  throw backendError;
                }

                // Brief delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } else {
            console.warn('Token response missing access token');
            throw new Error('No access token in response');
          }
        } catch (tokenError) {
          console.error(
            'Token acquisition failed during auth check:',
            tokenError
          );

          if (tokenError instanceof InteractionRequiredAuthError) {
            console.log('Interactive login required');
            set({
              isAuthenticated: false,
              authMethod: null,
              isLoading: false,
              error: 'Please sign in to continue',
            });
          } else {
            console.error('Auth status check failed:', tokenError);
            set({
              isAuthenticated: false,
              authMethod: null,
              isLoading: false,
              error:
                'Authentication verification failed. Please try signing in again.',
            });
          }
        }
      } else {
        console.log('No accounts found, user needs to sign in');
        set({
          isAuthenticated: false,
          authMethod: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      set({
        isAuthenticated: false,
        authMethod: null,
        isLoading: false,
        error: 'Authentication check failed. Please refresh the page.',
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearInteractionState: () => {
    const { msalInstance } = get();
    if (msalInstance) {
      try {
        // Clear any stuck interaction state
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
        }
        console.log('Interaction state cleared successfully');
      } catch (error) {
        console.warn('Could not clear interaction state:', error);
      }
    }
    set({ isLoading: false, error: null });
  },
}));

// Export the MSAL instance for use in components
export { msalConfig, loginRequest };
