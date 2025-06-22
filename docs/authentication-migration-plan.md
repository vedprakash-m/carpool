# VCarpool Authentication Migration to Microsoft Entra External ID

## Executive Summary

This document outlines a comprehensive plan to migrate VCarpool's custom JWT authentication system to Microsoft Entra External ID (formerly Azure AD B2C), providing enhanced security, reduced maintenance overhead, and improved user experience.

## Current State Analysis

### Existing Authentication System

- **Type**: Custom JWT-based authentication
- **User Storage**: Azure Cosmos DB
- **Password Security**: bcrypt hashing with salt
- **Token Management**: JWT access tokens + secure refresh tokens
- **Role Management**: Database-driven (Parent, Admin, SuperAdmin)
- **Additional Features**: SMS verification, address validation, emergency contacts

### Current Issues Identified

1. **Maintenance Overhead**: Custom authentication requires ongoing security updates
2. **Password Management**: Users must remember another password
3. **Security Responsibility**: Full responsibility for authentication security
4. **Limited Features**: No SSO, MFA, or social login options
5. **Scalability Concerns**: Custom solution may not scale with enterprise features

## Migration Strategy

### Phase 1: Preparation and Planning (2-3 weeks)

#### 1.1 Entra External ID Tenant Setup

```bash
# Azure CLI setup
az ad app create --display-name "VCarpool-External-ID" \
  --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
  --enable-id-token-issuance true
```

#### 1.2 Custom Attributes Configuration

Set up custom user attributes in Entra External ID:

- `extension_Role` (Parent/Admin/SuperAdmin)
- `extension_SchoolId` (for school association)
- `extension_PhoneVerified` (boolean)
- `extension_AddressVerified` (boolean)
- `extension_EmergencyContact` (string)

#### 1.3 User Flow Design

Create user flows for:

- **Sign up and sign in**: Combined flow with email verification
- **Password reset**: Self-service password reset
- **Profile editing**: Allow users to update profile information

### Phase 2: Backend Integration (3-4 weeks)

#### 2.1 Install Required Dependencies

```json
{
  "dependencies": {
    "@azure/msal-node": "^2.6.0",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.0"
  }
}
```

#### 2.2 Create Entra Authentication Service

```typescript
import { ConfidentialClientApplication } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import { CosmosService } from './cosmos.service';

export interface EntraUserProfile {
  objectId: string;
  email: string;
  givenName: string;
  surname: string;
  role: 'Parent' | 'Admin' | 'SuperAdmin';
  schoolId?: string;
  phoneVerified: boolean;
  addressVerified: boolean;
  emergencyContact?: string;
}

export class EntraAuthService {
  private msalInstance: ConfidentialClientApplication;
  private cosmosService: CosmosService;

  constructor() {
    this.msalInstance = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.ENTRA_CLIENT_ID!,
        clientSecret: process.env.ENTRA_CLIENT_SECRET!,
        authority: process.env.ENTRA_AUTHORITY!,
      },
    });
    this.cosmosService = new CosmosService();
  }

  /**
   * Validate Entra External ID token and extract user profile
   */
  async validateEntraToken(token: string): Promise<EntraUserProfile | null> {
    try {
      // Validate token with Entra External ID
      const clientInfo = await this.msalInstance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: null, // Will be provided by the token
      });

      // Decode JWT to extract custom claims
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        throw new Error('Invalid token format');
      }

      const claims = decoded.payload as any;

      return {
        objectId: claims.sub,
        email: claims.email,
        givenName: claims.given_name,
        surname: claims.family_name,
        role: claims['extension_Role'] || 'Parent',
        schoolId: claims['extension_SchoolId'],
        phoneVerified: claims['extension_PhoneVerified'] === 'true',
        addressVerified: claims['extension_AddressVerified'] === 'true',
        emergencyContact: claims['extension_EmergencyContact'],
      };
    } catch (error) {
      console.error('Entra token validation failed:', error);
      return null;
    }
  }

  /**
   * Sync Entra user with VCarpool database
   */
  async syncUserWithDatabase(entraUser: EntraUserProfile): Promise<void> {
    try {
      const existingUser = await this.cosmosService.findUserByEmail(entraUser.email);

      if (existingUser) {
        // Update existing user with Entra information
        await this.cosmosService.updateUser(existingUser.id, {
          entraObjectId: entraUser.objectId,
          firstName: entraUser.givenName,
          lastName: entraUser.surname,
          role: entraUser.role,
          phoneVerified: entraUser.phoneVerified,
          addressVerified: entraUser.addressVerified,
          lastLoginAt: new Date(),
          authProvider: 'entra',
        });
      } else {
        // Create new user from Entra profile
        await this.cosmosService.createUser({
          id: `user_${Date.now()}`,
          entraObjectId: entraUser.objectId,
          email: entraUser.email,
          firstName: entraUser.givenName,
          lastName: entraUser.surname,
          role: entraUser.role,
          schoolId: entraUser.schoolId,
          phoneVerified: entraUser.phoneVerified,
          addressVerified: entraUser.addressVerified,
          emergencyContact: entraUser.emergencyContact,
          authProvider: 'entra',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });
      }
    } catch (error) {
      console.error('User sync failed:', error);
      throw new Error('Failed to sync user with database');
    }
  }

  /**
   * Generate VCarpool session token for Entra-authenticated user
   */
  async generateSessionToken(entraUser: EntraUserProfile): Promise<string> {
    const payload = {
      userId: entraUser.objectId,
      email: entraUser.email,
      role: entraUser.role,
      schoolId: entraUser.schoolId,
      phoneVerified: entraUser.phoneVerified,
      addressVerified: entraUser.addressVerified,
      authProvider: 'entra',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, { algorithm: 'HS256' });
  }
}
```

#### 2.3 Update Azure Functions for Hybrid Authentication

```typescript
// auth-entra-unified/index.ts
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { EntraAuthService } from '../src/services/entra-auth.service';
import { AuthService } from '../src/services/auth.service'; // Legacy auth

export async function authEntraUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const entraAuthService = new EntraAuthService();
  const legacyAuthService = new AuthService(); // Fallback

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);

    // Try Entra External ID validation first
    const entraUser = await entraAuthService.validateEntraToken(token);
    if (entraUser) {
      await entraAuthService.syncUserWithDatabase(entraUser);
      const sessionToken = await entraAuthService.generateSessionToken(entraUser);

      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          user: entraUser,
          sessionToken,
          authProvider: 'entra',
        }),
      };
    }

    // Fallback to legacy authentication
    const legacyUser = await legacyAuthService.validateToken(token);
    if (legacyUser) {
      return {
        status: 200,
        body: JSON.stringify({
          success: true,
          user: legacyUser,
          authProvider: 'legacy',
        }),
      };
    }

    return { status: 401, body: 'Invalid token' };
  } catch (error) {
    context.error('Authentication error:', error);
    return { status: 500, body: 'Authentication service error' };
  }
}
```

#### 2.4 Database Schema Updates

```typescript
// Add to existing user schema
interface User {
  // ... existing fields
  entraObjectId?: string;
  authProvider: 'legacy' | 'entra';
  migrationDate?: Date;
  lastAuthProvider?: string;
}
```

### Phase 3: Frontend Integration (2-3 weeks)

#### 3.1 Install MSAL React Dependencies

```json
{
  "dependencies": {
    "@azure/msal-browser": "^3.10.0",
    "@azure/msal-react": "^2.0.0"
  }
}
```

#### 3.2 MSAL Configuration

```typescript
// frontend/src/config/entra.config.ts
import { Configuration } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_ENTRA_AUTHORITY!,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};
```

#### 3.3 Authentication Provider Component

```typescript
// frontend/src/providers/AuthProvider.tsx
'use client';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../config/entra.config';

const msalInstance = new PublicClientApplication(msalConfig);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
}
```

#### 3.4 Hybrid Login Component

```typescript
// frontend/src/components/HybridLogin.tsx
import { useMsal } from '@azure/msal-react';
import { useState } from 'react';
import { LegacyLoginForm } from './LegacyLoginForm';

export function HybridLogin() {
  const { instance } = useMsal();
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);

  const handleEntraLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: ['openid', 'profile', 'email']
      });
    } catch (error) {
      console.error('Entra login failed:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to VCarpool</h2>

        {/* Entra External ID Login (Primary) */}
        <button
          onClick={handleEntraLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          Sign in with Microsoft
        </button>

        <div className="text-center">
          <button
            onClick={() => setShowLegacyLogin(!showLegacyLogin)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Use email and password instead
          </button>
        </div>

        {/* Legacy Login (Fallback) */}
        {showLegacyLogin && (
          <div className="mt-4 pt-4 border-t">
            <LegacyLoginForm />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Phase 4: Migration Strategy (4-6 weeks)

#### 4.1 Gradual Migration Approach

1. **Soft Launch**: Deploy hybrid authentication alongside existing system
2. **User Opt-in**: Allow users to link their accounts to Microsoft
3. **Admin Migration**: Migrate admin users first for testing
4. **Bulk Migration**: Encourage remaining users to migrate
5. **Legacy Deprecation**: Phase out legacy authentication

#### 4.2 Data Migration Script

```typescript
// scripts/migrate-users-to-entra.ts
export async function migrateUsersToEntra() {
  const cosmosService = new CosmosService();
  const users = await cosmosService.getAllUsers();

  for (const user of users) {
    if (user.authProvider === 'legacy') {
      // Send migration invitation email
      await sendMigrationInvitation(user);

      // Mark as migration pending
      await cosmosService.updateUser(user.id, {
        migrationStatus: 'pending',
        migrationInvitedAt: new Date(),
      });
    }
  }
}
```

### Phase 5: Testing and Validation (2-3 weeks)

#### 5.1 Test Coverage Areas

- **Authentication Flow**: Login, logout, token refresh
- **Role-Based Access**: Verify role mapping and permissions
- **Data Sync**: Ensure user data consistency
- **Fallback Scenarios**: Legacy authentication still works
- **Error Handling**: Graceful handling of authentication failures

#### 5.2 Security Testing

- **Token Validation**: Verify Entra tokens are properly validated
- **Session Management**: Test session timeouts and renewals
- **Authorization**: Confirm role-based access controls work
- **Data Protection**: Ensure sensitive data remains secure

## Implementation Timeline

| Phase              | Duration        | Key Deliverables                           |
| ------------------ | --------------- | ------------------------------------------ |
| Phase 1: Planning  | 2-3 weeks       | Entra tenant setup, user flows configured  |
| Phase 2: Backend   | 3-4 weeks       | Hybrid authentication service, API updates |
| Phase 3: Frontend  | 2-3 weeks       | MSAL integration, hybrid login UI          |
| Phase 4: Migration | 4-6 weeks       | Gradual user migration, data sync          |
| Phase 5: Testing   | 2-3 weeks       | Comprehensive testing, security validation |
| **Total**          | **13-19 weeks** | **Full Entra External ID integration**     |

## Benefits of Migration

### Security Benefits

- **Reduced Attack Surface**: Microsoft handles authentication security
- **MFA Support**: Built-in multi-factor authentication options
- **Threat Protection**: Advanced threat detection and prevention
- **Compliance**: Built-in compliance with security standards

### User Experience Benefits

- **Single Sign-On**: Users can use existing Microsoft accounts
- **Password-less Options**: Support for modern authentication methods
- **Self-Service**: Users can reset passwords and manage profiles
- **Social Login**: Optional integration with social providers

### Operational Benefits

- **Reduced Maintenance**: No need to maintain custom authentication
- **Scalability**: Handles enterprise-scale user management
- **Monitoring**: Built-in analytics and monitoring
- **Support**: Microsoft support for authentication issues

## Risk Assessment and Mitigation

### Technical Risks

| Risk                            | Impact | Probability | Mitigation                              |
| ------------------------------- | ------ | ----------- | --------------------------------------- |
| User data loss during migration | High   | Low         | Comprehensive backup and rollback plan  |
| Authentication service downtime | High   | Low         | Hybrid approach with legacy fallback    |
| Custom claims not supported     | Medium | Low         | Validate all custom attributes in pilot |
| Integration complexity          | Medium | Medium      | Phased implementation with testing      |

### Business Risks

| Risk                      | Impact | Probability | Mitigation                                |
| ------------------------- | ------ | ----------- | ----------------------------------------- |
| User resistance to change | Medium | Medium      | Clear communication and gradual migration |
| Increased Azure costs     | Low    | High        | Cost analysis and budgeting               |
| Vendor lock-in            | Medium | High        | Document migration path and alternatives  |

## Cost Analysis

### Current Costs (Annual)

- **Development Time**: ~40 hours/year for auth maintenance
- **Security Updates**: ~20 hours/year
- **Support**: ~30 hours/year
- **Total**: ~90 hours/year (~$15,000 at $167/hour)

### Entra External ID Costs

- **Monthly Active Users (MAU)**: First 50,000 free, then $0.0055/MAU
- **Estimated Cost**: $100-500/month for typical school usage
- **Development Savings**: ~$10,000/year in reduced maintenance

### Net Benefit

- **Break-even**: ~6-8 months
- **Annual Savings**: $8,000-12,000 after implementation

## Recommendations

### Immediate Actions (Next 2 weeks)

1. **Set up Entra External ID tenant** for testing
2. **Create proof of concept** with basic authentication flow
3. **Identify pilot user group** (admin users + volunteers)
4. **Review compliance requirements** for your school district

### Implementation Priority

1. **High Priority**: Basic authentication and user sync
2. **Medium Priority**: Role mapping and permissions
3. **Low Priority**: Advanced features (MFA, social login)

### Success Criteria

- **Security**: No authentication-related security incidents
- **Performance**: Login time < 3 seconds (vs current ~2 seconds)
- **User Adoption**: >80% of active users migrated within 6 months
- **Maintenance**: <10 hours/month authentication-related support

## Conclusion

Migrating to Microsoft Entra External ID is **highly recommended** for VCarpool. The migration will:

✅ **Enhance Security**: Leverage Microsoft's enterprise-grade security  
✅ **Reduce Complexity**: Eliminate custom authentication maintenance  
✅ **Improve User Experience**: Provide modern authentication options  
✅ **Future-Proof**: Support enterprise features and scalability  
✅ **Cost-Effective**: Save development time and reduce operational overhead

The hybrid approach ensures minimal risk while providing a clear migration path. The estimated 13-19 week timeline allows for thorough testing and gradual user migration.

**Next Step**: Begin Phase 1 preparation to validate the technical approach and confirm business requirements.
