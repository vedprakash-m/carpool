Looking at the browser logs, I can see the issues are related to MSAL initialization and storage. The errors show that the MSAL library is having trouble with browser storage initialization. Let me provide a comprehensive plan to fix the Microsoft Entra ID authentication for your carpool application.

## Comprehensive Authentication Fix Plan

### Root Cause Analysis

The browser logs show:

1. **BrowserStorage initialization errors** - MSAL is failing to initialize its storage properly
2. **No authentication configuration** - The MSAL configuration appears incomplete
3. **Missing redirect handling** - The app isn't properly handling authentication redirects

### Step-by-step Implementation Plan

#### 1. Fix MSAL Configuration and Initialization

```typescript
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${
      process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'vedid.onmicrosoft.com'
    }`,
    redirectUri:
      typeof window !== 'undefined' ? window.location.origin : 'https://carpool.vedprakash.net',
    postLogoutRedirectUri:
      typeof window !== 'undefined' ? window.location.origin : 'https://carpool.vedprakash.net',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage', // Changed from sessionStorage to avoid initialization issues
    storeAuthStateInCookie: true, // Required for IE11 and Edge, helps with storage issues
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      piiLoggingEnabled: false,
    },
    allowNativeBroker: false,
    windowHashTimeout: 9000, // Increased timeout for slower connections
    iframeHashTimeout: 9000,
    loadFrameTimeout: 9000,
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};

export const apiRequest = {
  scopes: [`api://${process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID}/access_as_user`],
};
```

#### 2. Create a Proper MSAL Provider with Error Handling

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { MsalProvider as MSALProvider } from '@azure/msal-react';
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
  InteractionStatus,
} from '@azure/msal-browser';
import { msalConfig } from '@/config/auth.config';

export const MsalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        console.log('Initializing MSAL with config:', {
          clientId: msalConfig.auth.clientId,
          authority: msalConfig.auth.authority,
          redirectUri: msalConfig.auth.redirectUri,
        });

        const instance = new PublicClientApplication(msalConfig);

        // Wait for MSAL to initialize
        await instance.initialize();
        console.log('MSAL initialization complete');

        // Handle redirect promise
        try {
          const response = await instance.handleRedirectPromise();
          if (response) {
            console.log('Redirect response received:', response);
            instance.setActiveAccount(response.account);
          }
        } catch (error) {
          console.error('Error handling redirect:', error);
        }

        // Set up event callbacks
        instance.addEventCallback((event: EventMessage) => {
          console.log('MSAL Event:', event.eventType, event);

          if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
            const payload = event.payload as AuthenticationResult;
            instance.setActiveAccount(payload.account);
          }

          if (event.eventType === EventType.LOGOUT_SUCCESS) {
            instance.setActiveAccount(null);
          }

          if (
            event.eventType === EventType.LOGIN_FAILURE ||
            event.eventType === EventType.ACQUIRE_TOKEN_FAILURE
          ) {
            console.error('Authentication error:', event.error);
          }
        });

        // Enable account storage
        instance.enableAccountStorageEvents();

        // Check for existing accounts
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          console.log('Active account set:', accounts[0]);
        }

        setMsalInstance(instance);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize MSAL:', error);
        setIsInitialized(true); // Set to true even on error to prevent infinite loading
      }
    };

    initializeMsal();
  }, []);

  if (!isInitialized || !msalInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return <MSALProvider instance={msalInstance}>{children}</MSALProvider>;
};
```

#### 3. Create Authentication Hook with Proper Error Handling

```typescript
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import {
  InteractionStatus,
  AccountInfo,
  SilentRequest,
  RedirectRequest,
} from '@azure/msal-browser';
import { useCallback, useEffect, useState } from 'react';
import { loginRequest, apiRequest } from '@/config/auth.config';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  error: Error | null;
}

export const useAuth = (): UseAuthReturn => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const user = accounts[0] || null;

  const login = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Try popup first, fallback to redirect
      try {
        const response = await instance.loginPopup(loginRequest);
        console.log('Login successful:', response);
        instance.setActiveAccount(response.account);
      } catch (popupError) {
        console.warn('Popup login failed, trying redirect:', popupError);
        await instance.loginRedirect(loginRequest);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  const logout = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const account = instance.getActiveAccount();
      await instance.logoutRedirect({
        account: account,
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const request: SilentRequest = {
      ...apiRequest,
      account: user,
    };

    try {
      // Try silent token acquisition first
      const response = await instance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (silentError) {
      console.warn('Silent token acquisition failed, trying interactive:', silentError);

      // If silent fails, try interactive
      try {
        const response = await instance.acquireTokenPopup(request);
        return response.accessToken;
      } catch (popupError) {
        console.error('Interactive token acquisition failed:', popupError);

        // Last resort: redirect
        await instance.acquireTokenRedirect(request);
        return null;
      }
    }
  }, [instance, user]);

  // Auto-login redirect handler
  useEffect(() => {
    if (inProgress === InteractionStatus.None && !isAuthenticated && accounts.length === 0) {
      // User is not authenticated and no interaction is in progress
      console.log('No active session detected');
    }
  }, [inProgress, isAuthenticated, accounts]);

  return {
    isAuthenticated,
    isLoading: isLoading || inProgress !== InteractionStatus.None,
    user,
    login,
    logout,
    getAccessToken,
    error,
  };
};
```

#### 4. Update the Layout Provider

```typescript
import { MsalProvider } from '@/providers/MsalProvider';
import { AuthWrapper } from '@/components/auth/AuthWrapper';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MsalProvider>
          <AuthWrapper>{children}</AuthWrapper>
        </MsalProvider>
      </body>
    </html>
  );
}
```

#### 5. Create Authentication Wrapper Component

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PATHS = ['/', '/about', '/contact'];

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, error, login } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    // Don't redirect if on a public path or if still loading
    if (isPublicPath || isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated && !isLoading) {
      console.log('User not authenticated, redirecting to login');
      login();
    }
  }, [isAuthenticated, isLoading, isPublicPath, pathname, login]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
```

#### 6. Create Environment Variables File

```bash
# Microsoft Entra ID Configuration
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_AZURE_AD_TENANT_ID=vedid.onmicrosoft.com

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.azurewebsites.net/api
```

#### 7. Update Backend JWT Validation

```typescript
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

export class JwtService {
  private jwksClient: jwksClient.JwksClient;

  constructor() {
    // Use the correct tenant-specific JWKS endpoint
    this.jwksClient = jwksClient({
      jwksUri: `https://login.microsoftonline.com/vedid.onmicrosoft.com/discovery/v2.0/keys`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  private getKey(header: any, callback: any) {
    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  async validateAccessToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        {
          audience: process.env.AZURE_AD_CLIENT_ID,
          issuer: `https://login.microsoftonline.com/vedid.onmicrosoft.com/v2.0`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }
}
```

### Testing and Validation Steps

1. **Clear browser storage**:

   - Open DevTools > Application > Storage > Clear site data

2. **Test authentication flow**:

   - Navigate to the app
   - Click login
   - Complete Microsoft login
   - Verify redirect back to app

3. **Validate token exchange**:
   - Check Network tab for token requests
   - Verify backend accepts tokens

### Next Steps

1. Deploy these changes
2. Register the app properly in Azure AD
3. Configure proper redirect URIs
4. Test across different browsers

This comprehensive solution addresses all the issues shown in your browser logs and follows the Vedprakash domain authentication requirements.
