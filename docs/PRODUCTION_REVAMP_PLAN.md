# Carpool Production Revamp Plan

## Cost-Optimized Azure Architecture & Production Readiness Roadmap

**Document Version**: 3.0 (Comprehensive Revision Based on Deep-Dive Analysis)  
**Date**: January 19, 2026  
**Author**: GitHub Copilot (Architecture Analysis)  
**Current Project Status**: Post-Feature-Freeze, Pre-Production  
**Target Architecture**: Azure Static Web App + Functions Flex Consumption  
**Deployment Model**: Single environment, production-only (cost-optimized)  
**Infrastructure Strategy**: Delete and recreate all Azure resources (clean slate)

---

## Executive Summary

### Current State Assessment

The Carpool Management System is a **feature-complete** monorepo (~77,500 LOC backend, ~55,000 LOC frontend) with **100% of PRD requirements implemented**. However, it's **not production-ready** due to critical configuration gaps, architectural inconsistencies, and deployment readiness issues.

**Actual Metrics from Deep-Dive Analysis (January 19, 2026)**:

- **Backend Tests**: 698 passing tests across 38 suites
- **Frontend Tests**: 388 passing tests across 30 suites
- **Backend Coverage**: 75.5% statements (not 87.74% as previously reported)
- **Frontend Coverage**: ~30% (critical gap in auth stores, services, hooks)

**Critical Issues Identified**:

1. **🔴 CRITICAL: Three Competing Auth Paths** (not just "local secrets vs JWKS"):
   - Path 1: Entra ID tokens → JWKS validation (correctly implemented but has fallback)
   - Path 2: Legacy tokens → Local secret validation (security risk)
   - Path 3: Frontend has THREE auth stores fighting for control

2. **🔴 CRITICAL: Frontend Auth Store Fragmentation**:
   - `entra-auth.store.ts` (610 lines) - Entra ID flow
   - `auth.store.ts` (291 lines) - Legacy password flow
   - `auth.store.new.ts` (272 lines) - Appears unused (dead code)

3. **⚠️ Configuration Fragmentation**: 4 overlapping configuration services:
   - `config.service.ts` (primary singleton)
   - `configuration-manager.ts` (duplicate)
   - `database.ts` (legacy)
   - Direct `process.env` access scattered throughout

4. **⚠️ Azure Function Proliferation**: 68 function directories (not 90+):
   - Many single-purpose endpoints that should be consolidated
   - Inconsistent patterns (some TypeScript, some JavaScript)
   - Mixed middleware usage

5. **❌ Cosmos DB Partition Key Mismatch**:
   - Users partitioned by `/id` but queried by `email` (causes cross-partition queries)
   - Will become expensive at scale

6. **❌ E2E Tests Exist But Not in CI**:
   - 21 Playwright specs exist in `e2e/specs/`
   - Not wired into GitHub Actions pipeline

7. **❌ Infrastructure**: Bicep templates exist but need fresh deployment
   - Decision: **Delete and recreate all Azure resources**

### 🎯 Revised Strategy: Cost-Optimized Single Environment

**Target Architecture**: Azure Static Web App + Azure Functions Flex Consumption Plan

**Key Decisions**:

- ✅ **Single Resource Group**: `carpool-rg` (all resources unified)
- ✅ **Single Environment**: Production-only (no dev/staging/prod splits)
- ✅ **Region**: West US 2 (co-located for low latency)
- ✅ **Naming Convention**: `carpool-{resource-type}` (no environment suffix)
- ✅ **Cost Target**: $25-60/month (vs. original $125-210/month estimate)

### Updated Timeline: **12 Weeks (Realistic) / 16 Weeks (Full Scope)**

**Critical Path for 12-Week MVP Launch** (Scope-Cut Version):

| Phase                          | Duration    | Focus                                                  |
| ------------------------------ | ----------- | ------------------------------------------------------ |
| **Phase 1: Security & Auth**   | Weeks 1-3   | DELETE legacy auth path, consolidate stores, JWKS-only |
| **Phase 2: Infrastructure**    | Week 4      | Delete/recreate Azure resources, deploy fresh          |
| **Phase 3: API Consolidation** | Weeks 5-8   | 68 functions → 15-20 resource-based endpoints          |
| **Phase 4: Frontend Cleanup**  | Week 9      | Single auth store, remove dead code                    |
| **Phase 5: Testing & Launch**  | Weeks 10-12 | Manual smoke tests, 5-family beta                      |

**Full Scope Timeline (16 Weeks)**:

- Add E2E automation: +2 weeks
- 20-family launch: +2 weeks
- AI integration: Post-launch fast-follow

**Key Scope Decisions**:

- ✅ **5 families** for initial beta (not 20) - allows manual support during stabilization
- ✅ **DELETE** legacy auth path (not unify) - faster and cleaner
- ✅ **Skip** E2E automation for MVP - use manual testing + CI unit tests
- ✅ **Defer** AI features to post-launch
- ✅ **Add** preview mode for unauthenticated users (UX improvement)

**Expected Outcome**: Production-ready, cost-optimized carpool platform for **5 Tesla STEM families** with minimal operational overhead. Scale to 20 families at Week 16.

---

## Part 1: Cost-Optimized Azure Architecture

### 1.1 Target Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE RESOURCE GROUP                        │
│                        carpool-rg                               │
│                      (West US 2 Region)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend Tier                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Azure Static Web App (Free Tier)                         │  │
│  │ Name: carpool-web                                        │  │
│  │ - Next.js 14 App Router                                  │  │
│  │ - Automatic HTTPS & CDN                                  │  │
│  │ - GitHub Actions integration                             │  │
│  │ - Cost: $0/month (Free tier sufficient)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  Backend Tier                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Azure Functions App (Flex Consumption)                   │  │
│  │ Name: carpool-api                                        │  │
│  │ - Node.js 20 runtime                                     │  │
│  │ - 20-25 consolidated endpoints                           │  │
│  │ - Auto-scale to zero when idle                           │  │
│  │ - Cost: $5-15/month (1M free executions)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  Data Tier                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Cosmos DB (Serverless Mode)                              │  │
│  │ Name: carpool-cosmos                                     │  │
│  │ Database: carpool                                        │  │
│  │ - Auto-scaling RU consumption                            │  │
│  │ - Point-in-time restore (30 days)                       │  │
│  │ - Cost: $10-25/month (small dataset)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Supporting Services                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key Vault                  │ Application Insights        │  │
│  │ Name: carpool-kv           │ Name: carpool-insights      │  │
│  │ - Secrets storage          │ - Monitoring & logs         │  │
│  │ - Certificate management   │ - Performance metrics       │  │
│  │ Cost: $1-3/month          │ Cost: $5-10/month          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Communication Services                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Azure Communication Services (Shared Across VED Apps)    │  │
│  │ Resource Group: ved-acs-rg                               │  │
│  │ - SMS & Email delivery                                   │  │
│  │ - Cost: $5-10/month (usage-based)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Authentication                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Microsoft Entra ID (Shared Across VED Apps)              │  │
│  │ Tenant: vedid.onmicrosoft.com                            │  │
│  │ - SSO for all .vedprakash.net applications              │  │
│  │ - App Registration: carpool-app                          │  │
│  │ - Cost: $0 (Free tier for small user base)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Total Monthly Cost: $26-63 (vs. original estimate of $125-210)
Cost Savings: ~70%
```

### 1.2 Resource Naming Convention

**Standard Pattern**: `carpool-{resource-type}`

| Resource Type                   | Name                | Notes                          |
| ------------------------------- | ------------------- | ------------------------------ |
| Resource Group                  | `carpool-rg`        | Single group for all resources |
| Static Web App                  | `carpool-web`       | Frontend Next.js app           |
| Function App                    | `carpool-api`       | Backend API                    |
| Storage Account                 | `carpoolstorage`    | No hyphens (naming constraint) |
| Cosmos DB Account               | `carpool-cosmos`    | NoSQL database                 |
| Cosmos DB Database              | `carpool`           | Database name                  |
| Key Vault                       | `carpool-kv`        | Secrets management             |
| Application Insights            | `carpool-insights`  | Monitoring                     |
| Log Analytics Workspace         | `carpool-logs`      | Centralized logging            |
| App Service Plan (Flex)         | `carpool-flex-plan` | Serverless plan                |
| Communication Services (shared) | `ved-azure-comms`   | Shared across VED apps         |
| Entra ID App Registration       | `carpool-app`       | OAuth2/OIDC configuration      |

**Notes**:

- No environment suffix (no `-dev`, `-staging`, `-prod`)
- Consistent hyphen usage (except where Azure restricts)
- Lowercase for DNS compatibility

### 1.3 Cost Analysis & Justification

#### Detailed Cost Breakdown (Monthly) - Revised Estimates

| Service                    | SKU/Plan         | Plan Estimate | Revised Estimate | Notes                                         |
| -------------------------- | ---------------- | ------------- | ---------------- | --------------------------------------------- |
| **Static Web App**         | Free             | $0            | $0               | ✅ Correct                                    |
| **Function App**           | Flex Consumption | $5-15         | **$10-30**       | Cold starts + 20-25 endpoints = more cost     |
| **App Service Plan**       | Flex Consumption | $0            | $0               | ✅ Included                                   |
| **Storage Account**        | Standard LRS     | $1-3          | $1-3             | ✅ Correct                                    |
| **Cosmos DB**              | Serverless       | $10-25        | **$15-40**       | Cross-partition queries on users table        |
| **Key Vault**              | Standard         | $1-3          | $1-3             | ✅ Correct                                    |
| **Application Insights**   | Pay-as-you-go    | $5-10         | **$10-20**       | 1M free events fills fast with tracing        |
| **Communication Services** | Pay-per-use      | $5-10         | $5-10            | ✅ Correct                                    |
| **Entra ID**               | Free             | $0            | $0               | ✅ Correct for <50 users                      |
| **TOTAL**                  |                  | **$27-66**    | **$42-106**      | Still 50-60% below original $125-210 estimate |

#### Cost Scaling Projections (Updated)

| User Growth  | Monthly Cost | Notes                             |
| ------------ | ------------ | --------------------------------- |
| 5 families   | $30-50       | **Initial beta target**           |
| 20 families  | $40-70       | Week 16 expansion target          |
| 50 families  | $50-90       | Comfortable within free/low tiers |
| 100 families | $80-130      | May need Static Web App Standard  |
| 200 families | $120-180     | May need provisioned Cosmos DB    |
| 500 families | $280-450     | Requires Premium Functions plan   |

**Recommendation**: Start with 5 families, monitor costs closely, expand to 20 families after validating cost model.

### 1.4 Why This Architecture Works

#### Azure Static Web Apps Benefits

✅ **Free CDN**: Global content delivery included  
✅ **Automatic HTTPS**: SSL certificates managed by Azure  
✅ **GitHub Integration**: Deploy on git push  
✅ **Zero Configuration**: No server management  
✅ **Serverless APIs**: Optional Function App integration  
✅ **Custom Domains**: Free (carpool.vedprakash.net)

**Perfect for**: Low-traffic, content-heavy frontend (Next.js static export)

#### Azure Functions Flex Consumption Benefits

✅ **Pay per execution**: No idle costs when not in use  
✅ **Auto-scale to zero**: No minimum instances  
✅ **Fast startup**: Optimized cold start (2-3s acceptable)  
✅ **Burstable compute**: Handle traffic spikes  
✅ **Integrated monitoring**: Application Insights included

**Perfect for**: Sporadic API traffic, batch jobs (schedule generation)

#### Cosmos DB Serverless Benefits

✅ **No provisioned RU**: Pay only for consumed RUs  
✅ **Auto-scaling**: Handles traffic spikes automatically  
✅ **Multi-region replication**: Available if needed (extra cost)  
✅ **Point-in-time restore**: 30-day backup retention  
✅ **No minimum cost**: True pay-as-you-go

**Perfect for**: Small datasets (<10GB), unpredictable traffic patterns

---

## Part 1.5: Immediate Actions (Week 0 - Day 1)

Before starting the formal phases, execute these immediate cleanup tasks to reduce cognitive overhead:

### 1.5.1 Delete Dead Code (~1,500 lines)

```bash
# Execute immediately to clean up the codebase
rm frontend/src/store/auth.store.new.ts          # 272 lines - unused auth store
rm frontend/src/store/auth.store.ts.backup       # backup file
rm backend/auth-entra-unified/index_old.ts       # old implementation
rm backend/src/services/monitoring.service.simple.ts  # empty file
rm backend/index.js.broken                        # broken file
```

### 1.5.2 Identify Files to Consolidate

| Category            | Current Files                    | Target     | Action                                    |
| ------------------- | -------------------------------- | ---------- | ----------------------------------------- |
| **Auth Stores**     | 3 stores (610 + 291 + 272 lines) | 1 store    | Keep `entra-auth.store.ts`, delete others |
| **Config Services** | 4 services                       | 1 service  | Keep `config.service.ts`, consolidate     |
| **Dashboard Pages** | 4 versions                       | 1 page     | Audit and merge                           |
| **Auth Endpoints**  | 5 functions                      | 1 endpoint | Consolidate to `/api/auth`                |

### 1.5.3 Document Critical Environment Variables

```bash
# Required for production (verify all exist in Key Vault plan)
AZURE_TENANT_ID=vedid.onmicrosoft.com
AZURE_CLIENT_ID=<from-app-registration>
COSMOS_DB_ENDPOINT=https://carpool-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<from-key-vault>
COSMOS_DB_DATABASE=carpool
APPLICATIONINSIGHTS_CONNECTION_STRING=<from-azure>
AZURE_COMMUNICATION_CONNECTION_STRING=<from-azure>

# DELETE THESE (legacy, no longer needed after auth consolidation)
# JWT_SECRET - replaced by JWKS
# JWT_EXPIRES_IN - handled by Entra ID
```

---

## Part 2: Critical Authentication Fix (HIGHEST PRIORITY)

### 2.1 Current Authentication Problems (Deep-Dive Analysis)

**Key Finding**: The problem is more nuanced than originally documented. JWKS **IS** implemented, but there's a problematic fallback path.

#### Problem 1: Three Competing Authentication Paths (🔴 CRITICAL)

**Actual Code Analysis** (from `backend/src/services/auth/jwt.service.ts`):

```typescript
// Path 1: Entra ID tokens - CORRECTLY uses JWKS (lines 92-150)
if (decodedToken.payload.iss.includes('microsoftonline')) {
  const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
  const signingKey = key.getPublicKey();
  const payload = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    issuer: expectedIssuer,
    audience: expectedAudience,
  });
  // ✅ This path is CORRECT
}

// Path 2: Legacy tokens - Uses LOCAL SECRET (lines 151-182)
else {
  // 🔴 PROBLEM: Falls back to local secret for non-Entra tokens
  const payload = jwt.verify(token, options.secret, {
    issuer: options.issuer,
    audience: options.audience,
    algorithms: options.algorithms,
  });
  // This allows forged tokens if JWT_SECRET is known
}
```

**The Real Issue**: The code has a dual-path architecture where:

- Entra ID tokens are validated correctly via JWKS ✅
- Legacy/internal tokens fall back to local secret validation 🔴

**Solution**: **DELETE the legacy path entirely** rather than trying to unify.

#### Problem 2: Frontend Has THREE Auth Stores (🔴 CRITICAL)

```typescript
// Store 1: entra-auth.store.ts (610 lines) - Entra ID flow
export const useEntraAuthStore = create<EntraAuthStore>()...
// Uses MSAL, handles redirects, token acquisition

// Store 2: auth.store.ts (291 lines) - Legacy password flow
export const useAuthStore = create<AuthStore>()...
// Uses axios to POST to /api/auth?action=login
// Stores tokens in localStorage via setTokens()

// Store 3: auth.store.new.ts (272 lines) - APPEARS UNUSED
export const useNewAuthStore = create<NewAuthStore>()...
// Dead code - should be deleted immediately
```

**Race Condition Example**:

```typescript
// Component A uses entra-auth.store
const { isAuthenticated } = useEntraAuthStore();

// Component B uses auth.store
const { isAuthenticated } = useAuthStore();

// These can have DIFFERENT values at the same time!
```

**Solution**: Delete `auth.store.ts` and `auth.store.new.ts`, keep only `entra-auth.store.ts`.

#### Problem 3: Legacy Password Flow Still Exists

**Current**: The system supports both Entra ID login AND password-based login.

```typescript
// auth-unified/index.ts still handles password login
case 'login':
  result = await handleLogin(body, context); // Password-based auth
  break;
```

**Decision**: Remove password-based authentication entirely. All users must authenticate via Entra ID.

**Why This is Broken**:

1. Tokens are supposed to be signed by Microsoft's private key
2. Backend should validate using Microsoft's **public key** (fetched from JWKS endpoint)
3. Instead, backend validates using `JWT_SECRET` from environment (local secret)
4. This means: **Anyone with JWT_SECRET can forge tokens** (security bypass!)

**Attack Vector**:

```bash
# Attacker with JWT_SECRET can create fake tokens:
const fakeToken = jwt.sign(
  { sub: 'admin-user', email: 'attacker@evil.com', role: 'super_admin' },
  process.env.JWT_SECRET  # Leaked from source control
);
# Backend will accept this fake token as valid!
```

#### Problem 2: Multiple Authentication Stores in Frontend (Race Conditions)

**Current Implementations**:

```typescript
// 1. frontend/src/store/entra-auth.store.ts (Zustand)
export const useEntraAuthStore = create<EntraAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  // ...
}));

// 2. frontend/src/store/auth.store.ts (Another Zustand store!)
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  // ...
}));

// 3. frontend/src/config/auth.config.ts (MSAL instance)
export const msalInstance = new PublicClientApplication(msalConfig);
```

**Problem**: Three sources of truth causing:

- Race conditions (MSAL updates before Zustand, or vice versa)
- Inconsistent authentication state across components
- Token storage in both memory and localStorage
- Difficult to debug authentication issues

#### Problem 3: No Token Refresh Logic

**Current State**:

- Access tokens expire after 1 hour (Entra ID default)
- No automatic refresh mechanism
- Users forcibly logged out after token expiry
- Manual re-login required

**Expected Behavior**:

- Silent token refresh 5 minutes before expiry
- Seamless user experience (no forced logout)
- Refresh token rotation for security

### 2.2 Comprehensive Authentication Migration Plan

#### Phase 1: Backend JWKS Integration (Week 1, Days 1-3)

**Step 1: Update JWT Service to Use JWKS** (Day 1)

Create new file: `backend/src/services/auth/entra-jwt.service.ts`

```typescript
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { JWTPayload } from '@carpool/shared';

/**
 * Entra ID JWT Validation Service
 * Uses Microsoft's JWKS endpoint for token verification (CORRECT APPROACH)
 */
export class EntraJWTService {
  private readonly jwksClient: jwksClient.JwksClient;
  private readonly tenantId: string;
  private readonly clientId: string;

  constructor() {
    this.tenantId = process.env.AZURE_TENANT_ID || 'vedid.onmicrosoft.com';
    this.clientId = process.env.AZURE_CLIENT_ID!;

    if (!this.clientId) {
      throw new Error('AZURE_CLIENT_ID is required for Entra ID authentication');
    }

    // Initialize JWKS client with Microsoft's public keys endpoint
    this.jwksClient = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes (Microsoft rotates keys periodically)
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Validate Entra ID access token (CORRECT IMPLEMENTATION)
   */
  async validateAccessToken(token: string): Promise<JWTPayload> {
    // Step 1: Decode token to get header (contains 'kid' - key ID)
    const decodedToken = jwt.decode(token, { complete: true });

    if (!decodedToken || typeof decodedToken === 'string') {
      throw new Error('Invalid token format');
    }

    // Step 2: Validate token is from Microsoft (issuer check)
    const payload = decodedToken.payload as any;
    const expectedIssuer = `https://login.microsoftonline.com/${this.tenantId}/v2.0`;

    if (payload.iss !== expectedIssuer) {
      throw new Error(`Invalid issuer. Expected: ${expectedIssuer}, Got: ${payload.iss}`);
    }

    // Step 3: Fetch Microsoft's public key using 'kid' from token header
    const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
    const publicKey = key.getPublicKey();

    // Step 4: Verify token signature with Microsoft's public key
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'], // Entra ID uses RS256 (RSA Signature with SHA-256)
      issuer: expectedIssuer,
      audience: this.clientId, // Token must be issued for THIS application
    }) as any;

    // Step 5: Extract user information from validated token
    return {
      sub: verified.sub || verified.oid, // User ID
      email: verified.email || verified.preferred_username,
      role: verified.role || 'parent', // Default role (updated from DB later)
      permissions: verified.permissions || [],
      authProvider: 'entra',
      iat: verified.iat,
      exp: verified.exp,
      iss: verified.iss,
      aud: verified.aud,
    };
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

// Export singleton instance
export const entraJWTService = new EntraJWTService();
```

**Step 2: Update Authentication Middleware** (Day 2)

```typescript
// backend/src/middleware/auth.middleware.ts
import { HttpRequest, InvocationContext } from '@azure/functions';
import { entraJWTService } from '../services/auth/entra-jwt.service';
import { databaseService } from '../services/database.service';

export const authenticate = async (req: HttpRequest, ctx: InvocationContext): Promise<void> => {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const token = entraJWTService.extractToken(authHeader);
  if (!token) {
    throw new Error('Invalid Authorization format. Expected: Bearer <token>');
  }

  try {
    // Validate token with Microsoft's public keys
    const payload = await entraJWTService.validateAccessToken(token);

    // Fetch user profile from database for latest role/permissions
    const user = await databaseService.getUserByEmail(payload.email);

    if (!user) {
      throw new Error('User not found. Please complete registration.');
    }

    if (!user.isActive) {
      throw new Error('User account is disabled');
    }

    // Attach user to request for downstream handlers
    (req as any).auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    };

    ctx.log('User authenticated:', { userId: user.id, email: user.email });
  } catch (error) {
    ctx.error('Authentication failed:', error);
    throw new Error('Authentication failed: ' + (error.message || 'Unknown error'));
  }
};
```

**Step 3: Testing JWKS Validation** (Day 3)

```typescript
// backend/src/__tests__/services/entra-jwt.service.test.ts
import { entraJWTService } from '../../services/auth/entra-jwt.service';
import nock from 'nock';

describe('EntraJWTService', () => {
  beforeEach(() => {
    // Mock JWKS endpoint
    nock('https://login.microsoftonline.com')
      .get('/vedid.onmicrosoft.com/discovery/v2.0/keys')
      .reply(200, {
        keys: [
          {
            kid: 'test-key-id',
            n: 'test-modulus',
            e: 'AQAB',
            kty: 'RSA',
            use: 'sig',
          },
        ],
      });
  });

  describe('validateAccessToken', () => {
    it('should validate genuine Entra ID token', async () => {
      // Generate test token signed with Entra ID private key (mock)
      const testToken = 'genuine-entra-id-token';

      const payload = await entraJWTService.validateAccessToken(testToken);

      expect(payload.authProvider).toBe('entra');
      expect(payload.email).toBeDefined();
    });

    it('should reject token with invalid issuer', async () => {
      const fakeToken = 'token-from-wrong-issuer';

      await expect(entraJWTService.validateAccessToken(fakeToken)).rejects.toThrow(
        'Invalid issuer',
      );
    });

    it('should reject expired token', async () => {
      const expiredToken = 'expired-entra-token';

      await expect(entraJWTService.validateAccessToken(expiredToken)).rejects.toThrow(
        'jwt expired',
      );
    });
  });
});
```

#### Phase 2: Frontend Auth Consolidation (Week 1, Days 4-5)

**Step 1: Single Auth Provider** (Day 4 Morning)

Create new file: `frontend/src/providers/UnifiedAuthProvider.tsx`

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal, useAccount, useIsAuthenticated } from '@azure/msal-react';
import { AccountInfo, InteractionStatus } from '@azure/msal-browser';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || null);
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch access token on mount and when account changes
  useEffect(() => {
    if (account && isAuthenticated && inProgress === InteractionStatus.None) {
      getAccessToken().then(token => {
        setAccessToken(token);
        setIsLoading(false);
      });
    } else {
      setIsLoading(inProgress !== InteractionStatus.None);
    }
  }, [account, isAuthenticated, inProgress]);

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) return null;

    try {
      // Silent token acquisition (uses refresh token if access token expired)
      const response = await instance.acquireTokenSilent({
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        account: account,
      });

      return response.accessToken;
    } catch (error) {
      console.error('Silent token acquisition failed:', error);

      // If silent fails, trigger interactive login
      try {
        const response = await instance.acquireTokenPopup({
          scopes: ['User.Read', 'openid', 'profile', 'email'],
          account: account,
        });
        return response.accessToken;
      } catch (popupError) {
        console.error('Interactive token acquisition failed:', popupError);
        return null;
      }
    }
  };

  const login = async () => {
    try {
      await instance.loginRedirect({
        scopes: ['User.Read', 'openid', 'profile', 'email'],
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect({
        account: account,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user: account,
    accessToken,
    login,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for accessing auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within UnifiedAuthProvider');
  }
  return context;
}
```

**Step 2: Update API Client to Use Auth Context** (Day 4 Afternoon)

```typescript
// frontend/src/lib/api-client.ts
import { useAuth } from '@/providers/UnifiedAuthProvider';

export class APIClient {
  private baseURL: string;
  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api';
    this.getToken = getToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Get fresh access token
    const token = await this.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // CORRECT: Send Entra ID token
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Example: Create group
  async createGroup(data: CreateGroupRequest): Promise<Group> {
    return this.request<Group>('/v1/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Hook to use API client with authentication
export function useAPIClient() {
  const { getAccessToken } = useAuth();
  return new APIClient(getAccessToken);
}
```

**Step 3: Remove Old Auth Stores** (Day 5)

```bash
# Delete duplicate authentication stores:
rm frontend/src/store/entra-auth.store.ts
rm frontend/src/store/auth.store.ts

# Keep only:
# - frontend/src/providers/UnifiedAuthProvider.tsx
# - frontend/src/config/auth.config.ts (MSAL configuration)
```

#### Phase 3: Environment Configuration (Week 2, Days 1-2)

**Step 1: Entra ID App Registration** ✅ ALREADY CONFIGURED

**Current Configuration**:

- **Display Name**: Carpool App
- **Tenant**: vedid.onmicrosoft.com
- **Redirect URIs**:
  - Production: `https://carpool.vedprakash.net`
  - Local Development: `http://localhost:3000`
- **API Permissions**: User.Read (Microsoft Graph)
- **Token Configuration**: Access tokens, ID tokens enabled

**User Provisioning Strategy**: Automatic creation on first login

```typescript
// backend/src/middleware/auth.middleware.ts
// Auto-provision new users on first successful authentication
let user = await databaseService.getUserByEmail(payload.email);

if (!user) {
  // First-time user - auto-provision with default role
  user = await databaseService.createUser({
    id: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email.split('@')[0],
    role: 'parent', // Default role (admin manually upgraded later)
    authProvider: 'entra',
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  ctx.log('Auto-provisioned new user:', { userId: user.id, email: user.email });
}
```

**manifest.json** (API permissions):

```json
[
  {
    "resourceAppId": "00000003-0000-0000-c000-000000000000",
    "resourceAccess": [
      {
        "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
        "type": "Scope"
      }
    ]
  }
]
```

**Step 2: Update Environment Variables**

**Backend** (`.env` or Key Vault):

```bash
# Azure Entra ID Configuration
AZURE_TENANT_ID=vedid.onmicrosoft.com
AZURE_CLIENT_ID=<client-id-from-app-registration>

# Cosmos DB
COSMOS_DB_ENDPOINT=https://carpool-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<from-key-vault>
COSMOS_DB_DATABASE=carpool

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=<from-azure>

# NO MORE JWT_SECRET! (removed - we use Microsoft's keys)
```

**Frontend** (`.env.local`):

```bash
NEXT_PUBLIC_AZURE_CLIENT_ID=<same-client-id-as-backend>
NEXT_PUBLIC_AZURE_TENANT_ID=vedid.onmicrosoft.com
NEXT_PUBLIC_API_URL=https://carpool-api.azurewebsites.net/api
```

#### Phase 4: Token Refresh Implementation (Week 2, Days 3-5)

```typescript
// frontend/src/hooks/useTokenRefresh.ts
import { useEffect } from 'react';
import { useAuth } from '@/providers/UnifiedAuthProvider';

/**
 * Automatically refresh access token 5 minutes before expiry
 */
export function useTokenRefresh() {
  const { getAccessToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Check token expiry every 60 seconds
    const interval = setInterval(async () => {
      try {
        // MSAL automatically handles refresh if token expires soon
        await getAccessToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Force re-login if refresh fails
        window.location.href = '/login';
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [isAuthenticated, getAccessToken]);
}
```

### 2.3 Authentication Testing Strategy

#### Unit Tests (Backend)

```typescript
// Test JWKS validation
// Test token expiry handling
// Test invalid issuer rejection
// Test missing kid rejection
```

#### Integration Tests (E2E)

```typescript
// Test full login flow
// Test token refresh
// Test API calls with valid token
// Test API rejection with invalid token
```

#### Manual Testing Checklist

```
[ ] Login with Entra ID redirects correctly
[ ] Access token appears in network requests
[ ] Backend validates token successfully
[ ] Token refresh works before expiry
[ ] Logout clears all tokens
[ ] Protected routes require authentication
[ ] API returns 401 for invalid tokens
```

### 2.4 Rollback Plan

**If Authentication Migration Fails**:

1. Revert backend to local JWT validation (temporary)
2. Keep frontend using MSAL (still secure)
3. Investigate JWKS endpoint issues (firewall, DNS, etc.)
4. Retry migration with additional logging

**Rollback Command**:

```bash
git revert <commit-hash-of-auth-migration>
npm run deploy:backend
```

---

### 1.1 Project Structure (✅ Excellent)

```
carpool/
├── backend/           # Azure Functions v4 (TypeScript)
│   ├── 68 function directories (not 90+)
│   ├── src/services/  # Core business logic
│   ├── src/__tests__/ # 698 passing tests
│   └── infra/         # Bicep templates
├── frontend/          # Next.js 14 + App Router
│   ├── src/app/       # Page routes
│   ├── src/components/# React components
│   ├── src/store/     # Zustand state management (3 auth stores)
│   └── src/services/  # API clients
├── shared/            # TypeScript types & utilities
│   ├── src/entities/  # Unified data models
│   ├── src/contracts/ # API contracts
│   └── src/validations/# Zod schemas
└── e2e/               # Playwright (⚠️ NOT IMPLEMENTED)
```

**Strengths**:

- Clean monorepo with npm workspaces
- Shared types prevent backend/frontend drift
- TypeScript everywhere for type safety
- Clear separation of concerns

**Weaknesses**:

- No enforced folder structure guidelines
- Function endpoints scattered across 90+ directories
- Inconsistent naming conventions (snake_case vs camelCase)

---

### 1.2 Authentication Architecture (⚠️ Critical Issues)

#### Current Implementation

```typescript
// 🔴 PROBLEM: JWT service uses local secrets
// backend/src/services/auth/jwt.service.ts
this.jwksClient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
});

// But then validates with LOCAL SECRET:
jwt.verify(token, this.config.accessTokenSecret, {
  issuer: this.config.issuer,
  audience: this.config.audience,
});
```

**Issues**:

1. **Security Gap**: Tokens signed with local secrets instead of Microsoft's keys
2. **JWKS Configured But Not Used**: Client initialized but verification bypasses it
3. **Mixed Authentication**: Entra ID + local JWT creates confusion
4. **No Token Rotation**: Refresh tokens stored but no rotation logic
5. **Multiple Auth Services**: 4+ authentication service implementations

#### Frontend Authentication (⚠️ Fragmented)

```typescript
// Multiple auth stores exist:
1. EntraAuthStore (src/store/entra-auth.store.ts)
2. authStore (src/store/auth.store.ts)
3. MSAL instance (src/config/auth.config.ts)
```

**Problems**:

- Three sources of truth for authentication state
- Race conditions between MSAL and custom stores
- Inconsistent token storage (localStorage vs memory)
- No unified auth context

---

### 1.3 Database Architecture (⚠️ Moderate Issues)

#### Current Setup

```typescript
// Three database service implementations:
1. DatabaseService (src/services/database.service.ts) ✅ Primary
2. database.ts (src/config/database.ts) ⚠️ Legacy
3. DatabaseConnectionService ⚠️ Wrapper around #1
```

**Cosmos DB Containers** (✅ Well Designed):

```typescript
const CONTAINER_NAMES = {
  users: 'users', // Partition: /id
  groups: 'groups', // Partition: /id
  trips: 'trips', // Partition: /groupId
  schedules: 'schedules', // Partition: /groupId
  swapRequests: 'swapRequests', // Partition: /groupId
  messages: 'messages', // Partition: /chatRoomId
  notifications: 'notifications', // Partition: /userId
  weeklyPreferences: 'weeklyPreferences', // Partition: /groupId
};
```

**Issues**:

1. **Multiple Configuration Sources**:
   - `config.service.ts` (primary)
   - `database.ts` (legacy, still referenced)
   - Environment variables duplicated
2. **Fallback to In-Memory**: Good for testing, but inconsistent activation
3. **No Connection Pooling**: Each request creates new client
4. **No Retry Logic**: Transient errors cause failures
5. **Missing Indexes**: Only partition keys defined, no composite indexes

---

### 1.4 Backend API Architecture (⚠️ Significant Issues)

#### Function Endpoint Organization

**Current State**: 90+ Azure Functions with inconsistent patterns:

```
✅ Good Examples:
- admin-weekly-scheduling/index.ts (composite middleware, typed)
- trip-operations/index.ts (RESTful routing)

❌ Problematic Examples:
- auth-unified/index.js (JavaScript, no types)
- address-validation/index.js (legacy response handlers)
- hello-simple/index.js (minimal structure)
```

**Issues**:

1. **Mixed Languages**: TypeScript + JavaScript endpoints
2. **Inconsistent Middleware**: Some use compose(), others don't
3. **Duplicate Logic**: Response handling duplicated 50+ times
4. **No API Versioning**: All endpoints at /api/\*
5. **CORS Everywhere**: Every function handles CORS independently

#### Middleware Stack (✅ Good Foundation, ⚠️ Incomplete)

```typescript
// backend/src/middleware/index.ts
export const compose =
  (...middlewares) =>
  (handler) => {
    return middlewares.reduceRight((next, middleware) => middleware(next), handler);
  };

// Example usage:
app.http('admin-weekly-scheduling', {
  handler: compose(
    corsMiddleware,
    requestId,
    requestLogging,
    authenticate,
    hasRole('group_admin'),
  )(handler),
});
```

**Missing**:

- Rate limiting middleware
- Request validation middleware (Zod schemas not used)
- Error boundary middleware
- Performance monitoring hooks

---

### 1.5 Frontend Architecture (⚠️ Moderate Issues, Updated from Deep-Dive)

#### Next.js 14 App Router (✅ Modern, ⚠️ Underutilized)

**Current Structure**:

```
src/app/
├── (authenticated)/    # ✅ Route group for protected pages
├── admin/             # ⚠️ Should be in (authenticated)
├── auth/              # ❌ Mixed with dashboard
├── login/             # ❌ Duplicate auth patterns
├── register/          # ❌ Duplicate auth patterns
└── dashboard/         # ⚠️ Multiple dashboard implementations
```

**Issues**:

1. **Inconsistent Route Protection**: Some pages check auth, others don't
2. **Multiple Dashboard Pages**: `dashboard/`, `dashboard-new/`, `dashboard-minimal/`, `simple-dashboard/`
3. **No Loading States**: Suspense boundaries not implemented
4. **No Error Boundaries**: 500 errors crash entire app
5. **THREE Auth Stores**: Fighting for control (see Part 2.1)

#### State Management (🔴 Critical - 3 Auth Stores)

```typescript
// From deep-dive: THREE competing auth stores found
frontend/src/store/
├── entra-auth.store.ts  # 610 lines - Entra ID flow (KEEP)
├── auth.store.ts        # 291 lines - Legacy password flow (DELETE)
├── auth.store.new.ts    # 272 lines - DEAD CODE (DELETE IMMEDIATELY)
└── ...7 other stores
```

**Critical Finding**: `auth.store.new.ts` is never imported anywhere - it's dead code that should be deleted in Week 0.

**Problems**:

- No single source of truth
- Race conditions between stores
- Difficult to debug state changes
- Performance issues from re-renders
- State persistence inconsistent

#### Component Library (✅ Good Start, ⚠️ Incomplete)

**Existing Components** (1,900+ lines):

- ✅ `ParentInitiatedGroupCreation` (422 lines)
- ✅ `EnhancedParentStudentAssignment` (550+ lines)
- ✅ `TravelingParentSupport` (450+ lines)
- ✅ `TeslaSTEMIntegration` (500+ lines)

**Missing**:

- Design system tokens (colors, spacing, typography)
- Storybook for component documentation
- Accessibility testing
- Mobile-responsive testing

---

### 1.6 Infrastructure & Deployment (❌ Critical Gap → ✅ Delete & Recreate)

#### Bicep Templates (✅ Exist, Decision: Delete & Recreate)

```bicep
// infra/main.bicep - Complete infrastructure definition
- Function App (Flex Consumption)
- Static Web App
- Cosmos DB
- Key Vault
- Application Insights
- Storage Account
```

**User Decision**: Delete existing Azure resources and recreate with corrected configuration.

**Issues to Fix in Fresh Deployment**:

1. **Partition Key Mismatch**: Users container uses `/id` but queries use `email`
2. **No Environment Management**: Single template for dev/prod
3. **Hardcoded Values**: Some values need parameterization

**Fixes for Fresh Deployment**:

```bicep
// infra/main.bicep - CORRECTED
resource usersContainer 'Microsoft.DocumentDB/...' = {
  properties: {
    resource: {
      partitionKey: {
        paths: ['/email']  // ✅ FIXED: Match query patterns
        kind: 'Hash'
      }
    }
  }
}
```

#### CI/CD (❌ Absent → Phase 3)

**What Exists**:

- ✅ `.github/workflows/` folder
- ✅ GitHub Actions syntax files
- ❌ All workflows disabled or incomplete

**What's Missing**:

- Automated testing on PR
- Build and deploy pipeline
- Environment promotion (dev → staging → prod)
- Automated database migrations
- Secret management integration

---

### 1.7 Testing Coverage (Updated from Deep-Dive, May 2025)

#### Backend Tests (✅ Good Coverage)

```bash
# Actual test results (May 2025):
Test Suites: 39 passed, 39 total
Tests:       698 passed, 698 total  # Note: 698, not 428
Coverage:    75.5% statements       # Note: 75.5%, not 87.74%
```

**Strengths**:

- Unit tests for core services
- Integration tests for database
- Mocked external dependencies
- Fast test execution (~30s)

**Weaknesses**:

- No API endpoint tests (supertest)
- Some admin functions have low coverage
- Scheduling algorithm needs more tests
- Mock-heavy (limited real behavior testing)

#### Frontend Tests (⚠️ Low Coverage)

```bash
# Actual test results (May 2025):
Test Suites: 15 passed, 15 total
Tests:       388 passed, 388 total
Coverage:    ~30% statements  # CRITICAL GAP
```

**Issues**:

- Auth stores have 0% test coverage
- Many components untested
- Services layer needs tests
- No accessibility tests

#### E2E Tests (✅ Exist, ❌ Not in CI)

**Deep-Dive Finding**: E2E tests DO exist but aren't running:

```
e2e/specs/
├── auth/        # 5 specs
├── groups/      # 6 specs
├── scheduling/  # 4 specs
├── admin/       # 6 specs
└── Total: 21 Playwright test files
```

**Action Required**: Enable in CI pipeline (Phase 4)

---

### 1.8 Code Quality Issues

#### TypeScript Configuration (⚠️ Inconsistent)

```json
// Three different tsconfig.json files:
1. Root tsconfig.json (workspace references)
2. backend/tsconfig.json (strict mode OFF)
3. frontend/tsconfig.json (strict mode ON)
```

**Problems**:

- Inconsistent type checking
- `any` types allowed in backend
- No path aliases defined
- Build configuration scattered

#### Linting & Formatting (⚠️ Incomplete)

```json
// package.json scripts
"lint": "npm run build:shared && npm run lint:deps",
"lint:backend": "eslint src/**/*.ts",
```

**Issues**:

- No Prettier configured
- ESLint rules inconsistent
- No pre-commit hooks
- Manual linting required

#### Security Scanning (❌ Absent)

**Missing**:

- Dependency vulnerability scanning
- SAST (static analysis)
- Secrets detection (gitleaks configured but not enforced)
- Container scanning

---

## Part 2: Critical Production Gaps

### 2.1 Security Vulnerabilities (🔴 CRITICAL)

#### 1. JWT Authentication Bypass

**Risk**: CRITICAL  
**Impact**: Attackers can forge tokens

```typescript
// CURRENT (INSECURE):
const payload = jwt.verify(token, process.env.JWT_SECRET);

// REQUIRED:
const payload = await this.jwksClient
  .getSigningKey(kid)
  .then((key) => jwt.verify(token, key.getPublicKey()));
```

#### 2. No Rate Limiting

**Risk**: HIGH  
**Impact**: API abuse, DoS attacks

**Current State**: Each function handles rate limiting independently (inconsistent)

**Required**:

- Global rate limiting middleware
- Redis-based distributed rate limiting
- Per-user and per-IP limits

#### 3. Secrets in Code

**Risk**: HIGH  
**Impact**: Credential exposure

```typescript
// Found in multiple files:
JWT_SECRET: 'carpool-dev-secret-key';
COSMOS_DB_KEY: '...'; // In plain text environment files
```

**Required**:

- Azure Key Vault integration
- Secrets rotation policy
- No secrets in source control

#### 4. CORS Wildcard

**Risk**: MEDIUM  
**Impact**: Cross-site attacks

```typescript
// Current:
'Access-Control-Allow-Origin': '*'

// Required:
'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS
```

#### 5. No Input Sanitization

**Risk**: MEDIUM  
**Impact**: XSS, SQL injection (NoSQL)

**Current**: Zod validation exists but not enforced  
**Required**: Middleware validation on all inputs

---

### 2.2 Performance Issues

#### 1. Cold Start Times

**Issue**: Azure Functions Flex Consumption plan has ~2-5s cold starts

**Measurements Needed**:

```bash
# Benchmark cold starts
npm run perf:phase2
```

**Mitigation**:

- Reduce bundle size (tree shaking)
- Lazy load dependencies
- Consider Premium plan for production

#### 2. Database Query Optimization

**Issue**: No query performance monitoring

```typescript
// Current: Full collection scans
const users = await container.items.query('SELECT * FROM c WHERE c.role = "parent"').fetchAll();

// Required: Indexed queries with pagination
const query = {
  query: 'SELECT * FROM c WHERE c.role = @role',
  parameters: [{ name: '@role', value: 'parent' }],
};
```

#### 3. Frontend Bundle Size

**Issue**: Next.js build size unknown

**Required**:

```bash
npm run build:analyze  # Check bundle sizes
```

**Target**: <200KB initial bundle, <50KB per route

---

### 2.3 Operational Readiness Gaps

#### 1. No Logging Strategy

**Current**: console.log everywhere  
**Required**:

- Structured logging (Winston/Pino)
- Log levels (debug, info, warn, error)
- Log aggregation (Application Insights)
- Request correlation IDs

#### 2. No Monitoring/Alerting

**Current**: Application Insights configured but not used  
**Required**:

- Request/response metrics
- Error rate monitoring
- Latency percentiles (p50, p95, p99)
- Custom business metrics (groups created, trips scheduled)
- Alert rules (error rate > 5%, latency > 1s)

#### 3. No Incident Response Plan

**Required**:

- Runbook for common issues
- On-call rotation
- Incident postmortem template
- Status page

#### 4. No Backup/Disaster Recovery

**Current**: No automated backups  
**Required**:

- Cosmos DB backup policy (point-in-time restore)
- Database migration scripts
- Data export/import procedures
- Recovery time objective (RTO): 1 hour
- Recovery point objective (RPO): 15 minutes

---

## Part 3: Recommended Architecture

### 3.1 Clean Architecture Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  Next.js App Router + React Components │
│  - Pages (routes)                       │
│  - Components (UI)                      │
│  - Hooks (state)                        │
└────────────┬────────────────────────────┘
             │ HTTP/REST
┌────────────▼────────────────────────────┐
│         API Gateway Layer               │
│  Azure Functions HTTP Triggers          │
│  - Route handlers                       │
│  - Middleware (auth, validation)        │
│  - API versioning                       │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│       Application Layer                 │
│  Business Logic Services                │
│  - Domain services                      │
│  - Use cases                            │
│  - Orchestration                        │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│       Infrastructure Layer              │
│  Data Access & External Services        │
│  - Repositories                         │
│  - Cosmos DB                            │
│  - Azure services                       │
└─────────────────────────────────────────┘
```

### 3.2 Proposed Folder Structure

```
backend/
├── src/
│   ├── api/                 # API layer (Azure Functions)
│   │   ├── v1/             # API version 1
│   │   │   ├── auth/       # Auth endpoints
│   │   │   ├── groups/     # Group endpoints
│   │   │   ├── trips/      # Trip endpoints
│   │   │   └── users/      # User endpoints
│   │   └── middleware/     # Shared middleware
│   ├── application/         # Business logic
│   │   ├── services/       # Domain services
│   │   ├── use-cases/      # Use case implementations
│   │   └── contracts/      # Interfaces
│   ├── domain/             # Domain models
│   │   ├── entities/       # Core entities
│   │   ├── value-objects/  # Value objects
│   │   └── events/         # Domain events
│   ├── infrastructure/     # Data access
│   │   ├── repositories/   # Data repositories
│   │   ├── database/       # DB configuration
│   │   └── external/       # External APIs
│   └── shared/             # Utilities
│       ├── config/         # Configuration
│       ├── utils/          # Helper functions
│       └── constants/      # Constants
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── infra/                 # Infrastructure as Code
```

### 3.3 API Versioning Strategy

```typescript
// CURRENT: No versioning
app.http('trip-operations', {
  route: 'trips/{tripId?}',
  handler: tripHandler,
});

// PROPOSED: Versioned endpoints
app.http('trips-v1', {
  route: 'v1/trips/{tripId?}',
  handler: compose(apiVersion('v1'), authenticate, validateRequest(TripSchema))(tripHandlerV1),
});

// Future: Version negotiation via header
Accept: application / vnd.carpool.v2 + json;
```

---

## Part 4: Production Revamp Roadmap

### Phase 1: Security & Authentication (Weeks 1-3)

#### Week 1: Authentication Consolidation

**Goals**:

- ✅ Implement proper JWKS validation
- ✅ Remove local JWT secrets
- ✅ Unified authentication service
- ✅ Token rotation mechanism

**Tasks**:

1. **Update JWT Service** (Day 1-2)

   ```typescript
   // backend/src/services/auth/jwt.service.ts
   async validateAccessToken(token: string): Promise<JWTPayload> {
     const decodedToken = jwt.decode(token, { complete: true });

     // Get signing key from Microsoft
     const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
     const signingKey = key.getPublicKey();

     // Verify with Microsoft's public key
     const payload = jwt.verify(token, signingKey, {
       algorithms: ['RS256'],
       issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
       audience: process.env.AZURE_CLIENT_ID,
     });

     return payload;
   }
   ```

2. **Frontend Auth Consolidation** (Day 3-4)
   - Remove duplicate auth stores
   - Single EntraAuthProvider with MSAL
   - Unified auth context

   ```typescript
   // frontend/src/providers/auth-provider.tsx
   export function AuthProvider({ children }) {
     const { instance, accounts } = useMsal();
     const isAuthenticated = accounts.length > 0;

     return (
       <AuthContext.Provider value={{ isAuthenticated, instance }}>
         {children}
       </AuthContext.Provider>
     );
   }
   ```

3. **Token Refresh Logic** (Day 5)
   - Implement token rotation
   - Silent refresh before expiry
   - Logout on refresh failure

**Deliverables**:

- ✅ JWKS validation working
- ✅ All tests passing
- ✅ Authentication E2E test
- ✅ Security audit report

#### Week 2: Configuration Management

**Goals**:

- ✅ Centralized configuration service
- ✅ Azure Key Vault integration
- ✅ Environment-specific configs
- ✅ Secret rotation

**Tasks**:

1. **Unified Config Service** (Day 1-2)

   ```typescript
   // backend/src/shared/config/config.service.ts
   export class ConfigService {
     private static instance: ConfigService;
     private config: AppConfig;

     private constructor() {
       this.config = {
         database: this.loadDatabaseConfig(),
         auth: this.loadAuthConfig(),
         azure: this.loadAzureConfig(),
       };
     }

     static getInstance(): ConfigService {
       if (!ConfigService.instance) {
         ConfigService.instance = new ConfigService();
       }
       return ConfigService.instance;
     }
   }
   ```

2. **Key Vault Integration** (Day 3-4)

   ```typescript
   import { SecretClient } from '@azure/keyvault-secrets';
   import { DefaultAzureCredential } from '@azure/identity';

   const client = new SecretClient(process.env.KEY_VAULT_URL, new DefaultAzureCredential());

   const secret = await client.getSecret('COSMOS-DB-KEY');
   ```

3. **Environment Configuration** (Day 5)
   - `.env.development`
   - `.env.test`
   - `.env.production`

**Deliverables**:

- ✅ All configs centralized
- ✅ No secrets in code
- ✅ Key Vault integrated
- ✅ Configuration documentation

#### Week 3: Security Hardening

**Goals**:

- ✅ Input validation on all endpoints
- ✅ Rate limiting
- ✅ CORS properly configured
- ✅ Security headers

**Tasks**:

1. **Request Validation Middleware** (Day 1-2)

   ```typescript
   export const validateRequest = (schema: ZodSchema) => {
     return (next: Handler) => async (req, ctx) => {
       const result = schema.safeParse(req.body);
       if (!result.success) {
         return {
           status: 400,
           jsonBody: {
             error: 'Validation failed',
             details: result.error.flatten(),
           },
         };
       }
       return next(req, ctx);
     };
   };
   ```

2. **Rate Limiting** (Day 3)

   ```typescript
   import { RateLimiterMemory } from 'rate-limiter-flexible';

   const rateLimiter = new RateLimiterMemory({
     points: 10, // 10 requests
     duration: 1, // per 1 second
   });

   export const rateLimitMiddleware = (next) => async (req, ctx) => {
     const key = req.headers.get('x-forwarded-for') || 'unknown';
     try {
       await rateLimiter.consume(key);
       return next(req, ctx);
     } catch {
       return { status: 429, body: 'Too Many Requests' };
     }
   };
   ```

3. **Security Headers** (Day 4-5)

   ```typescript
   import helmet from 'helmet';

   export const securityHeaders = (next) => (req, ctx) => {
     const response = await next(req, ctx);
     return {
       ...response,
       headers: {
         ...response.headers,
         'X-Content-Type-Options': 'nosniff',
         'X-Frame-Options': 'DENY',
         'X-XSS-Protection': '1; mode=block',
         'Strict-Transport-Security': 'max-age=31536000',
       },
     };
   };
   ```

**Deliverables**:

- ✅ Security audit passed
- ✅ Penetration testing report
- ✅ OWASP compliance checklist
- ✅ Security documentation

---

### Phase 2: Architecture Consolidation (Weeks 5-8)

#### Week 5-6: API Consolidation (68 → 15-20 Endpoints)

**Goals**:

- ✅ Consolidate 68 functions to 15-20 resource-based endpoints
- ✅ Implement RESTful routing with method handling
- ✅ API versioning (v1)
- ✅ Consistent middleware chain

**Detailed Consolidation Plan**:

| Consolidated Endpoint            | HTTP Methods                  | Replaces These Functions                                                                  | Lines Saved |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| `/api/v1/auth`                   | POST (login, logout, refresh) | auth-unified, auth-login-db, auth-refresh-token, auth-token-v1, auth-entra-unified        | ~500        |
| `/api/v1/users/:id`              | GET, PUT                      | users-me, users-change-password, admin-create-user                                        | ~400        |
| `/api/v1/groups/:id`             | GET, PUT, POST, DELETE        | admin-carpool-groups, parent-group-creation, parent-group-search, parent-group-operations | ~800        |
| `/api/v1/groups/:id/members`     | GET, POST, DELETE             | admin-join-requests, enhanced-group-discovery                                             | ~300        |
| `/api/v1/groups/:id/schedule`    | GET, POST                     | admin-generate-schedule-simple, admin-weekly-scheduling, scheduling-operations            | ~600        |
| `/api/v1/groups/:id/preferences` | GET, PUT                      | parents-weekly-preferences-simple, admin-prefs-status                                     | ~300        |
| `/api/v1/trips/:id`              | GET, PUT, POST, DELETE        | trip-operations, trips-list                                                               | ~400        |
| `/api/v1/trips/stats`            | GET                           | trips-stats, trips-stats-db                                                               | ~200        |
| `/api/v1/swaps/:id`              | GET, POST, PUT                | admin-swap-requests, parent-swap-requests                                                 | ~400        |
| `/api/v1/notifications`          | GET, POST                     | admin-notifications, notifications-dispatch, notifications-history                        | ~500        |
| `/api/v1/admin/metrics`          | GET                           | admin-platform-metrics, admin-system-health                                               | ~300        |
| `/api/v1/admin/assignments`      | GET, POST                     | admin-parent-assignments, admin-driver-selection, admin-assignment-reminders              | ~400        |
| `/api/v1/addresses/validate`     | POST                          | address-validation, address-validation-secure, universal-address-validation               | ~300        |
| `/api/v1/phone/verify`           | POST                          | phone-verification, emergency-contact-verification                                        | ~200        |
| `/api/v1/health`                 | GET                           | hello, hello-simple, simple-test                                                          | ~100        |

**Total Functions Eliminated**: 68 → 15 endpoints  
**Estimated Lines Saved**: ~5,000+ lines of duplicated boilerplate

**Implementation Pattern** (Use existing `auth-unified` as template):

```typescript
// backend/src/api/v1/groups/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { compose, authenticate, validateBody, corsMiddleware } from '../../../middleware';
import { groupDomainService } from '../../../services/domains/group-domain.service';

async function groupsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const method = request.method;
  const groupId = request.params.groupId;
  const userId = request.auth!.userId;

  switch (method) {
    case 'GET':
      return groupId ? await getGroup(groupId, userId, context) : await listGroups(userId, context);
    case 'POST':
      return await createGroup(request, userId, context);
    case 'PUT':
      return await updateGroup(groupId, request, userId, context);
    case 'DELETE':
      return await deleteGroup(groupId, userId, context);
    default:
      return { status: 405, jsonBody: { error: 'Method not allowed' } };
  }
}

app.http('groups-v1', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  route: 'v1/groups/{groupId?}',
  handler: compose(corsMiddleware, authenticate)(groupsHandler),
});
```

**Tasks**:

1. **Create api/v1 directory structure** (Day 1)
2. **Migrate auth endpoints first** (Day 2) - Already have `auth-unified` as template
3. **Migrate groups endpoints** (Day 3-4)
4. **Migrate remaining endpoints** (Day 5-10)
5. **Delete old function directories** (Final day of each migration)
6. **Update frontend API client** (Parallel track)

**Deliverables**:

- ✅ API consolidated to 15-20 endpoints
- ✅ Swagger/OpenAPI spec generated
- ✅ Postman collection updated
- ✅ Frontend API client updated

#### Week 7: Database Optimization

**Goals**:

- ✅ Single database service
- ✅ Repository pattern
- ✅ Query optimization
- ✅ Connection pooling

**Tasks**:

1. **Unified Repository Pattern** (Week 5, Day 1-3)

#### Week 7: Database Optimization

**Goals**:

- ✅ Fix partition key mismatch (users queried by email, partitioned by id)
- ✅ Single database service (eliminate 3 duplicates)
- ✅ Repository pattern
- ✅ Query optimization

**Critical Fix: Partition Key Strategy**

**Current Problem** (from deep-dive analysis):

```bicep
// infra/main.bicep - INCORRECT
resource usersContainer ... {
  partitionKey: { paths: ['/id'], kind: 'Hash' }  // Partitioned by /id
}

// But most queries are:
// SELECT * FROM c WHERE c.email = @email  // Causes cross-partition query!
```

**Solution**: Since we're deleting and recreating infrastructure, fix partition keys:

```bicep
// Updated infra/main.bicep
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-06-15' = {
  parent: cosmosDbDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/email']  // ✅ FIXED: Match query patterns
        kind: 'Hash'
      }
    }
  }
}
```

**Partition Key Recommendations**:

| Container         | Current    | Recommended  | Reasoning              |
| ----------------- | ---------- | ------------ | ---------------------- |
| users             | `/id`      | **`/email`** | Login queries by email |
| groups            | `/id`      | `/id`        | ✅ Correct             |
| trips             | `/groupId` | `/groupId`   | ✅ Correct             |
| schedules         | `/groupId` | `/groupId`   | ✅ Correct             |
| weeklyPreferences | `/groupId` | `/groupId`   | ✅ Correct             |
| notifications     | `/userId`  | `/userId`    | ✅ Correct             |

**Tasks**:

1. **Consolidate Database Services** (Day 1-2)

   Delete these files and consolidate into `database.service.ts`:
   - `backend/src/config/database.ts` (legacy)
   - `backend/src/services/database-connection.service.ts` (wrapper)

   ```typescript
   // Single unified database service
   export class DatabaseService {
     private static instance: DatabaseService;
     private cosmosClient: CosmosClient;
     private database: Database;
     private containers: Map<string, Container> = new Map();

     // Singleton pattern (already implemented correctly)
     public static getInstance(): DatabaseService { ... }

     // All container access through typed methods
     public async getUserByEmail(email: string): Promise<UserEntity | null> {
       const container = this.getContainer('users');
       // Use email as partition key for efficient queries
       const { resources } = await container.items
         .query({
           query: 'SELECT * FROM c WHERE c.email = @email',
           parameters: [{ name: '@email', value: email }],
         })
         .fetchAll();
       return resources[0] || null;
     }
   }
   ```

2. **Implement Repository Pattern** (Day 3-4)

   ```typescript
   export abstract class BaseRepository<T> {
     constructor(protected container: Container) {}

     async findById(id: string): Promise<T | null> {
       const { resource } = await this.container.item(id, id).read();
       return resource as T;
     }

     async findAll(query: SqlQuerySpec): Promise<T[]> {
       const { resources } = await this.container.items.query(query).fetchAll();
       return resources as T[];
     }

     async create(item: T): Promise<T> {
       const { resource } = await this.container.items.create(item);
       return resource as T;
     }
   }
   ```

3. **Add Composite Indexes** (Day 5)

   ```json
   {
     "indexingMode": "consistent",
     "includedPaths": [
       { "path": "/groupId/?" },
       { "path": "/userId/?" },
       { "path": "/createdAt/?" },
       { "path": "/email/?" }
     ],
     "compositeIndexes": [
       [
         { "path": "/groupId", "order": "ascending" },
         { "path": "/createdAt", "order": "descending" }
       ],
       [
         { "path": "/userId", "order": "ascending" },
         { "path": "/status", "order": "ascending" }
       ]
     ]
   }
   ```

#### Week 8: Configuration Consolidation

**Goals**:

- ✅ Single configuration service
- ✅ Delete duplicate config files
- ✅ Environment-based configuration
- ✅ Zod validation on startup

**Current Problem** (from deep-dive):

```
4 configuration sources found:
1. backend/src/services/config.service.ts (primary - KEEP)
2. backend/src/config/configuration-manager.ts (duplicate - DELETE)
3. backend/src/config/database.ts (legacy - DELETE)
4. Direct process.env access (scattered - CONSOLIDATE)
```

**Tasks**:

1. **Delete Duplicate Config Files** (Day 1)

   ```bash
   rm backend/src/config/configuration-manager.ts
   rm backend/src/config/configuration-manager.js
   rm backend/src/config/database.ts
   ```

2. **Enhance config.service.ts with Zod Validation** (Day 2-3)

   ```typescript
   import { z } from 'zod';

   const ConfigSchema = z.object({
     cosmosDb: z.object({
       endpoint: z.string().url(),
       key: z.string().min(1),
       databaseName: z.string().default('carpool'),
     }),
     auth: z.object({
       azureTenantId: z.string().min(1),
       azureClientId: z.string().uuid(),
     }),
     // ... other sections
   });

   class ConfigService {
     private config: z.infer<typeof ConfigSchema>;

     private constructor() {
       const rawConfig = this.loadFromEnvironment();
       const result = ConfigSchema.safeParse(rawConfig);

       if (!result.success) {
         console.error('Configuration validation failed:', result.error.format());
         throw new Error('Invalid configuration');
       }

       this.config = result.data;
     }
   }
   ```

3. **Search and Replace Direct process.env Access** (Day 4-5)

   ```typescript
   // BEFORE (scattered throughout codebase)
   const endpoint = process.env.COSMOS_DB_ENDPOINT;

   // AFTER (centralized)
   const { endpoint } = configService.getConfig().cosmosDb;
   ```

**Deliverables**:

- ✅ Single database service
- ✅ Single config service with Zod validation
- ✅ All repositories tested
- ✅ Query performance benchmarks

**Deliverables**:

- ✅ Single DatabaseService
- ✅ All repositories tested
- ✅ Query performance benchmarks
- ✅ Database migration scripts

#### Week 7-8: Frontend Refactoring

**Goals**:

- ✅ Unified authentication flow
- ✅ Consistent state management
- ✅ Component library
- ✅ Mobile responsiveness

**Tasks**:

1. **Auth Flow Consolidation** (Week 7, Day 1-2)
   - Remove duplicate login pages
   - Single AuthProvider
   - Protected route HOC

2. **State Management** (Week 7, Day 3-5)

   ```typescript
   // Single source of truth
   export const useAppStore = create<AppState>((set) => ({
     user: null,
     groups: [],
     trips: [],
     setUser: (user) => set({ user }),
     setGroups: (groups) => set({ groups }),
   }));
   ```

3. **Component Library** (Week 8)
   - Design tokens
   - Storybook setup
   - Accessibility audit
   ```typescript
   // design-tokens.ts
   export const tokens = {
     colors: {
       primary: '#0066CC',
       secondary: '#6C757D',
       success: '#28A745',
       danger: '#DC3545',
     },
     spacing: {
       xs: '4px',
       sm: '8px',
       md: '16px',
       lg: '24px',
       xl: '32px',
     },
   };
   ```

**Deliverables**:

- ✅ Single auth flow
- ✅ Storybook with 20+ components
- ✅ Mobile responsive
- ✅ Accessibility score >90

---

### Phase 3: Deployment & DevOps (Weeks 9-10)

#### Week 9: Infrastructure Automation

**Goals**:

- ✅ Automated deployments
- ✅ Single-slot production deployment
- ✅ Simple rollback strategy (git revert + redeploy)
- ✅ CI/CD pipeline with automated testing

**Tasks**:

1. **CI/CD Pipeline** (Day 1-3)

   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to Azure

   on:
     push:
       branches: [main, develop]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Install dependencies
           run: npm ci
         - name: Run tests
           run: npm test
         - name: Build
           run: npm run build

     deploy-production:
       needs: test
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       environment: production
       steps:
         - name: Deploy to Azure Static Web App
           uses: Azure/static-web-apps-deploy@v1
           with:
             azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
             repo_token: ${{ secrets.GITHUB_TOKEN }}
             action: 'upload'
             app_location: '/frontend'
             api_location: ''
             output_location: 'out'

         - name: Deploy to Azure Functions (Flex Consumption)
           run: |
             cd backend
             npm ci --production
             npm run build
             func azure functionapp publish carpool-api \
               --typescript \
               --build remote

         - name: Deploy Infrastructure Updates (if needed)
           run: |
             az deployment group create \
               --resource-group carpool-rg \
               --template-file infra/main.bicep \
               --parameters @infra/parameters.json

     # Simple rollback: revert commit and re-run pipeline
     # No staging slots, no blue-green complexity
   ```

2. **Environment Configuration** (Day 4-5)
   - Single resource group: `carpool-rg`
   - Bicep templates for infrastructure
   - Secrets in Key Vault
   - Feature flags for safe production releases

**Testing Strategy**:

- ✅ All testing in local development environment
- ✅ Comprehensive unit/integration tests in CI pipeline
- ✅ Direct deployment to production after CI passes
- ✅ Rollback via `git revert` + automated redeployment

**Deliverables**:

- ✅ Automated deployments working
- ✅ CI pipeline blocks bad deployments
- ✅ Simple rollback procedure documented
- ✅ Dev/staging/prod environments
- ✅ Deployment documentation
- ✅ Rollback procedure

#### Week 10: Monitoring & Observability

**Goals**:

- ✅ Structured logging
- ✅ Application Insights integration
- ✅ Custom metrics
- ✅ Alert rules

**Tasks**:

1. **Structured Logging** (Day 1-2)

   ```typescript
   import { Logger } from 'winston';

   export const logger = Logger.createLogger({
     format: format.combine(format.timestamp(), format.json()),
     transports: [
       new transports.ApplicationInsights({
         instrumentationKey: process.env.APPINSIGHTS_KEY,
       }),
     ],
   });

   logger.info('User logged in', {
     userId: user.id,
     email: user.email,
     timestamp: new Date().toISOString(),
   });
   ```

2. **Custom Metrics** (Day 3-4)

   ```typescript
   const appInsights = require('applicationinsights');
   appInsights.setup(process.env.APPINSIGHTS_CONNECTION_STRING);
   const client = appInsights.defaultClient;

   // Track custom events
   client.trackEvent({
     name: 'GroupCreated',
     properties: {
       groupId: group.id,
       memberCount: group.members.length,
     },
   });

   // Track metrics
   client.trackMetric({
     name: 'ScheduleGenerationTime',
     value: duration,
   });
   ```

3. **Alert Rules** (Day 5)
   - Error rate > 5%
   - Response time p95 > 1s
   - Failed login attempts > 10/min
   - Cosmos DB RU consumption > 80%

**Deliverables**:

- ✅ Application Insights dashboard
- ✅ Alert rules configured
- ✅ On-call runbook
- ✅ Incident response plan

---

### Phase 4: Testing & Quality (Weeks 11-14)

**Testing Philosophy: Local + CI, Direct to Production**

✅ **All testing done locally and in CI pipeline**  
✅ **No staging environment** (cost optimization)  
✅ **Deploy to production only after all tests pass**  
✅ **Simple rollback: `git revert` + automated redeployment**

**Current State** (from deep-dive, May 2025):

| Metric            | Current              | Target    |
| ----------------- | -------------------- | --------- |
| Backend Tests     | 698 passing          | 750+      |
| Backend Coverage  | 75.5%                | 85%       |
| Frontend Tests    | 388 passing          | 500+      |
| Frontend Coverage | ~30%                 | 70%       |
| E2E Tests         | 21 specs (not in CI) | 50+ in CI |

#### Week 11: Frontend Test Coverage (🔴 Critical Gap)

**Goals**:

- ✅ Add tests for auth stores
- ✅ Test critical components
- ✅ Add service layer tests
- ✅ Reach 50% frontend coverage

**Tasks**:

1. **Auth Store Testing** (Day 1-2)

   The remaining `entra-auth.store.ts` needs comprehensive tests:

   ```typescript
   // frontend/src/store/__tests__/entra-auth.store.test.ts
   import { act } from '@testing-library/react';
   import { useEntraAuthStore } from '../entra-auth.store';

   describe('EntraAuthStore', () => {
     beforeEach(() => {
       useEntraAuthStore.getState().reset();
     });

     test('should handle successful MSAL login', async () => {
       const mockMsalInstance = createMockMsalInstance();
       const store = useEntraAuthStore.getState();

       await act(async () => {
         await store.login(mockMsalInstance);
       });

       expect(store.isAuthenticated).toBe(true);
       expect(store.user).toBeDefined();
     });

     test('should handle token expiry gracefully', async () => {
       // Test silent refresh behavior
     });

     test('should clear state on logout', () => {
       const store = useEntraAuthStore.getState();
       store.logout();
       expect(store.user).toBeNull();
     });
   });
   ```

2. **Component Testing** (Day 3-4)

   Priority components to test:
   - `ParentInitiatedGroupCreation` (422 lines, 0% coverage)
   - `EnhancedParentStudentAssignment` (550 lines, 0% coverage)
   - `GroupDashboard` variants

3. **Service Layer Tests** (Day 5)

   ```typescript
   // frontend/src/services/__tests__/api.service.test.ts
   describe('ApiService', () => {
     test('should attach auth header to requests', async () => {});
     test('should handle 401 and trigger refresh', async () => {});
     test('should queue requests during refresh', async () => {});
   });
   ```

#### Week 12: E2E Testing Integration

**Goals**:

- ✅ Enable existing E2E tests in CI
- ✅ Add missing critical flows
- ✅ Visual regression testing
- ✅ Performance benchmarks

**Current E2E State** (found in deep-dive):

```
e2e/specs/
├── auth/           # 5 specs (login, register, logout flows)
├── groups/         # 6 specs (create, join, manage)
├── scheduling/     # 4 specs (preferences, generation)
├── admin/          # 6 specs (user management, settings)
└── docker-compose.e2e.yml  # Test infrastructure EXISTS
```

**Tasks**:

1. **Enable E2E in CI Pipeline** (Day 1-2)

   ```yaml
   # .github/workflows/e2e.yml
   name: E2E Tests

   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]

   jobs:
     e2e:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Start test infrastructure
           run: docker-compose -f docker-compose.e2e.yml up -d

         - name: Wait for services
           run: npx wait-on http://localhost:3000 http://localhost:7071

         - name: Run Playwright tests
           run: npm run test:e2e
           working-directory: e2e

         - name: Upload test artifacts
           uses: actions/upload-artifact@v4
           if: failure()
           with:
             name: playwright-report
             path: e2e/playwright-report
   ```

2. **Add Missing Critical Flows** (Day 3-4)
   - Entra ID authentication (using test tenant)
   - Weekly preference submission → schedule generation
   - Swap request → approval flow
   - Notification delivery verification

3. **Visual Regression** (Day 5)

   ```typescript
   test('dashboard should match snapshot', async ({ page }) => {
     await page.goto('/dashboard');
     await expect(page).toHaveScreenshot('dashboard.png');
   });
   ```

#### Week 13-14: Code Quality & Documentation

**Goals**:

- ✅ Backend: 75.5% → 85% coverage
- ✅ Frontend: 30% → 70% coverage
- ✅ API documentation
- ✅ Developer handbook

**Tasks**:

1. **Backend Coverage Improvement** (Week 13)

   Focus on uncovered areas:
   - `scheduling-operations/` (complex algorithm, low coverage)
   - `admin-*` functions (many untested)
   - Error handling paths

   ```bash
   # Run with coverage report
   cd backend && npm run test:coverage

   # Target files with <70% coverage
   # Found in deep-dive: scheduling, admin functions need work
   ```

2. **Code Quality Tooling** (Week 14, Day 1-2)

   ```json
   // .eslintrc.json (already exists, enhance)
   {
     "extends": [
       "eslint:recommended",
       "plugin:@typescript-eslint/recommended",
       "plugin:security/recommended"
     ],
     "rules": {
       "no-console": "warn",
       "@typescript-eslint/no-explicit-any": "error",
       "@typescript-eslint/explicit-function-return-type": "warn"
     }
   }
   ```

3. **Documentation** (Week 14, Day 3-5)
   - API documentation (Swagger/OpenAPI)
   - Architecture diagrams (update from deep-dive findings)
   - Deployment guide
   - Developer onboarding

**Deliverables**:

- ✅ Backend coverage ≥85%
- ✅ Frontend coverage ≥70%
- ✅ All E2E tests in CI
- ✅ Complete API docs
- ✅ Developer handbook

---

### Phase 5: Production Launch (Weeks 15-16)

#### Week 15: Pre-Production Validation

**Goals**:

- ✅ Security audit
- ✅ Performance testing
- ✅ User acceptance testing (5 families)
- ✅ Production checklist

**Tasks**:

1. **Security Audit** (Day 1-2)
   - Penetration testing
   - OWASP compliance
   - Dependency audit

   ```bash
   npm audit
   npm run snyk test
   ```

2. **Performance Benchmarks** (Day 3-4)
   - Cold start: <3s
   - API response: p95 <500ms
   - Frontend load: <2s
   - Lighthouse score: >90

3. **UAT with Beta Families** (Day 5)
   - **5 initial families** (user decision: not 20)
   - Real-world scenarios
   - Feedback collection
   - Direct communication channel

**Deliverables**:

- ✅ Security audit report
- ✅ Performance benchmarks
- ✅ UAT feedback incorporated
- ✅ Production readiness checklist

#### Week 16: Production Deployment

**Goals**:

- ✅ Fresh infrastructure deployment (delete & recreate)
- ✅ Initial data setup (no migration needed)
- ✅ 5-family beta onboarding
- ✅ Post-launch monitoring

**Deployment Strategy** (User Decision: Delete & Recreate):

Since we're deleting existing infrastructure and creating fresh:

- ✅ No data migration needed (fresh start)
- ✅ Clean partition keys (fixed from /id to /email for users)
- ✅ No legacy configuration drift
- ⚠️ Requires re-enrollment of all test users

**Tasks**:

1. **Delete Existing Infrastructure** (Day 1)

   ```bash
   # Delete old resource group
   az group delete --name carpool-rg --yes --no-wait

   # Wait for deletion
   az group wait --deleted --name carpool-rg
   ```

2. **Deploy Fresh Infrastructure** (Day 2)

   ```bash
   # Deploy new infrastructure with corrected partition keys
   az deployment group create \
     --resource-group carpool-prod-rg \
     --template-file infra/main.bicep \
     --parameters @infra/parameters.prod.json

   # Verify deployment
   az functionapp show --name carpool-api --resource-group carpool-prod-rg
   ```

3. **Application Deployment** (Day 3)

   ```bash
   # Deploy backend
   cd backend && func azure functionapp publish carpool-api

   # Deploy frontend
   cd frontend && npm run deploy:prod
   ```

4. **Beta Family Onboarding** (Day 4-5)
   - **Invite 5 Tesla STEM families** (scope-cut per user decision)
   - Personal onboarding walkthroughs
   - Direct Slack/Discord channel for feedback
   - 2-week intensive monitoring period

**Success Criteria for Beta**:

| Metric                     | Target                              |
| -------------------------- | ----------------------------------- |
| Active families            | 5                                   |
| Successful group creation  | ≥1 group                            |
| Weekly schedules generated | 2+ weeks                            |
| Critical bugs              | 0                                   |
| User satisfaction          | Positive feedback from 4/5 families |

**Post-Beta Expansion**:

After successful 2-week beta with 5 families:

- Week 18: Expand to 10 families
- Week 20: Expand to 20 families
- Week 24: Open to full Tesla STEM community

**Deliverables**:

- ✅ Fresh production infrastructure
- ✅ 5 families onboarded
- ✅ Zero critical issues for 48 hours
- ✅ Post-launch monitoring active
- ✅ Expansion roadmap documented

---

## Part 4.5: AI Integration (Fast Follow-Up)

### 4.5.1 Overview

**Priority**: Fast follow-up feature (not in initial launch)  
**Model**: GPT-4o-mini (cost-effective, fast, sufficient for use cases)  
**Implementation Timeline**: Post-launch (Weeks 13-14)

### 4.5.2 AI Use Cases

#### 1. Scheduling Optimization Suggestions

**Problem**: Admins spend significant time resolving schedule conflicts manually

**AI Solution**:

```typescript
// backend/src/services/ai/scheduling-optimizer.service.ts
import { OpenAI } from 'openai';

export class SchedulingOptimizerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async suggestScheduleOptimizations(schedule: WeeklySchedule): Promise<OptimizationSuggestions> {
    const conflicts = this.detectConflicts(schedule);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a carpool scheduling assistant. Analyze conflicts and suggest fair solutions that minimize driving burden.',
        },
        {
          role: 'user',
          content: `Schedule has ${conflicts.length} conflicts:\n${JSON.stringify(conflicts, null, 2)}\n\nSuggest resolutions that balance fairness.`,
        },
      ],
      temperature: 0.3, // Low temperature for consistent, logical suggestions
      max_tokens: 500,
    });

    return this.parseSuggestions(response.choices[0].message.content);
  }
}
```

**Cost**: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens (GPT-4o-mini)  
**Estimated Usage**: 100 optimization requests/month = $0.10-0.50/month

#### 2. Smart Conflict Resolution

**Problem**: Parents propose swaps that create cascading conflicts

**AI Solution**:

```typescript
async analyzeSwapRequest(swap: SwapRequest): Promise<SwapAnalysis> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You analyze carpool swap requests for potential issues: cascading conflicts, fairness violations, safety concerns.',
      },
      {
        role: 'user',
        content: `Swap request: ${JSON.stringify(swap)}\nCurrent schedule: ${JSON.stringify(currentSchedule)}\n\nIdentify issues and suggest alternatives.`,
      },
    ],
    temperature: 0.2,
  });

  return {
    hasConflicts: true/false,
    issues: [...],
    suggestions: [...],
    confidenceScore: 0.85,
  };
}
```

#### 3. Parent Communication Assistance

**Problem**: Admins need to send personalized messages to parents (notifications, reminders, updates)

**AI Solution**:

```typescript
async generateParentMessage(context: MessageContext): Promise<string> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You write friendly, concise messages for carpool admins to send to parents. Tone: helpful, professional, parent-friendly.',
      },
      {
        role: 'user',
        content: `Generate message for: ${context.type}\nDetails: ${JSON.stringify(context.data)}`,
      },
    ],
    temperature: 0.7, // Higher temperature for natural language
    max_tokens: 200,
  });

  return response.choices[0].message.content;
}

// Example usage:
const message = await generateParentMessage({
  type: 'schedule_conflict',
  data: {
    parentName: 'Sarah',
    date: '2026-01-25',
    issue: 'Overlapping pickup times for two children',
  },
});

// Output: "Hi Sarah! We noticed a potential scheduling issue on Jan 25th..."
```

#### 4. Automated Assignment Fairness Analysis

**Problem**: Admins need to verify that driving assignments are fair over time

**AI Solution**:

```typescript
async analyzeDrivingFairness(assignments: Assignment[], period: DateRange): Promise<FairnessReport> {
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze carpool driving assignment fairness. Consider: total drives, distance, time slots, special circumstances.',
      },
      {
        role: 'user',
        content: `Assignments over ${period.weeks} weeks:\n${JSON.stringify(assignments)}\n\nIs distribution fair? Identify outliers.`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 4.5.3 Implementation Strategy

**Phase 1: Infrastructure Setup** (Week 13, Days 1-2)

1. Add OpenAI SDK to backend
2. Configure API key in Key Vault
3. Create base AI service class with rate limiting
4. Add cost tracking/monitoring

**Phase 2: Scheduling Optimizer** (Week 13, Days 3-5)

1. Implement conflict detection logic
2. Integrate GPT-4o-mini for suggestions
3. Add admin UI to view/approve suggestions
4. Test with historical schedules

**Phase 3: Other Use Cases** (Week 14)

1. Smart conflict resolution
2. Parent message generation
3. Fairness analysis dashboard

**Phase 4: Monitoring & Optimization** (Ongoing)

1. Track AI API costs
2. Monitor suggestion acceptance rate
3. Fine-tune prompts based on feedback
4. Add caching for repeated queries

### 4.5.4 Cost Management

**Projected Costs**:

- GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- Estimated usage: 50,000 tokens/month
- **Total AI costs: $1-3/month**

**Cost Controls**:

```typescript
// Rate limiting per user
const rateLimiter = {
  maxRequestsPerHour: 10,
  maxRequestsPerDay: 50,
};

// Caching for repeated queries
const cache = new Map<string, CachedResponse>();

// Budget alerts
if (monthlyAICost > 5) {
  sendAlert('AI costs exceeding $5/month');
}
```

### 4.5.5 Testing Strategy

**Unit Tests**:

- Mock OpenAI API responses
- Test prompt construction
- Verify error handling

**Integration Tests**:

- Test with real OpenAI API (staging)
- Validate suggestion quality
- Measure response times

**Manual Testing**:

- Admin feedback on suggestion quality
- Parent satisfaction with generated messages
- Fairness analysis accuracy

### 4.5.6 Rollback Plan

If AI features don't meet quality expectations:

1. Disable AI endpoints (feature flag)
2. Revert to manual admin workflows
3. Analyze feedback and iterate
4. Re-enable after improvements

**No impact on core carpool functionality** (AI is enhancement only)

---

## Part 5: Implementation Guidelines

### 5.1 Development Standards

#### Code Style

```typescript
// ✅ GOOD: Clear, typed, testable
export async function createGroup(
  request: CreateGroupRequest,
  userId: string,
): Promise<Result<Group>> {
  // Validate input
  const validation = CreateGroupSchema.safeParse(request);
  if (!validation.success) {
    return Err(new ValidationError(validation.error));
  }

  // Business logic
  const group = await groupRepository.create({
    ...request,
    adminId: userId,
    createdAt: new Date(),
  });

  // Return result
  return Ok(group);
}

// ❌ BAD: Unclear, untyped, hard to test
async function createGroup(req: any): Promise<any> {
  const group = await container.items.create(req.body);
  return group;
}
```

#### Testing Standards

```typescript
// ✅ GOOD: Arrange-Act-Assert pattern
describe('GroupService', () => {
  describe('createGroup', () => {
    it('should create a group with valid input', async () => {
      // Arrange
      const request: CreateGroupRequest = {
        name: 'Test Group',
        description: 'Test description',
      };
      const userId = 'user-123';

      // Act
      const result = await groupService.createGroup(request, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().name).toBe('Test Group');
    });
  });
});
```

#### Error Handling

```typescript
// ✅ GOOD: Typed errors, proper handling
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

// Usage
try {
  const group = await groupService.createGroup(request, userId);
  return { status: 200, jsonBody: group };
} catch (error) {
  if (error instanceof ValidationError) {
    return { status: 400, jsonBody: { error: error.message } };
  }
  logger.error('Unexpected error', error);
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}
```

### 5.2 Database Best Practices

#### Query Patterns

```typescript
// ✅ GOOD: Parameterized, indexed, paginated
export async function findGroupsByUserId(
  userId: string,
  pageSize: number = 20,
  continuationToken?: string,
): Promise<PagedResult<Group>> {
  const query: SqlQuerySpec = {
    query: `
      SELECT * FROM c 
      WHERE ARRAY_CONTAINS(c.memberIds, @userId)
      ORDER BY c.createdAt DESC
    `,
    parameters: [{ name: '@userId', value: userId }],
  };

  const { resources, continuationToken: nextToken } = await container.items
    .query(query, {
      maxItemCount: pageSize,
      continuationToken,
    })
    .fetchNext();

  return {
    items: resources,
    continuationToken: nextToken,
  };
}

// ❌ BAD: Full scan, no pagination
const groups = await container.items
  .query('SELECT * FROM c WHERE c.memberIds CONTAINS "user-123"')
  .fetchAll();
```

### 5.3 API Design Principles

#### RESTful Endpoints

```typescript
// ✅ GOOD: RESTful, versioned, clear
GET    /api/v1/groups              # List groups
GET    /api/v1/groups/:id          # Get group
POST   /api/v1/groups              # Create group
PUT    /api/v1/groups/:id          # Update group
DELETE /api/v1/groups/:id          # Delete group
POST   /api/v1/groups/:id/members  # Add member

// ❌ BAD: Unclear, no versioning
GET    /api/getgroups
POST   /api/group?action=create
POST   /api/addmember
```

#### Response Format

```typescript
// ✅ GOOD: Consistent, typed, informative
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

// ❌ BAD: Inconsistent, unclear
{ status: 'ok', result: {...} }
{ error: 'something went wrong' }
```

---

## Part 6: Success Metrics

### 6.1 Technical Metrics

| Metric                   | Current (May 2025) | Target | Critical |
| ------------------------ | ------------------ | ------ | -------- |
| Test Coverage (Backend)  | 75.5%              | 85%    | 80%      |
| Test Coverage (Frontend) | ~30%               | 70%    | 50%      |
| Backend Tests            | 698 passing        | 750+   | 700+     |
| Frontend Tests           | 388 passing        | 500+   | 450+     |
| E2E Tests in CI          | 0 (21 exist)       | 50+    | 30+      |
| API Response Time (p95)  | Unknown            | <500ms | <1s      |
| Cold Start Time          | Unknown            | <3s    | <5s      |
| Build Time               | Unknown            | <5min  | <10min   |
| Bundle Size (Frontend)   | Unknown            | <200KB | <500KB   |
| Lighthouse Score         | Unknown            | >90    | >80      |
| Security Audit Score     | Unknown            | >95    | >90      |

### 6.2 Operational Metrics

| Metric                | Target | Critical Threshold |
| --------------------- | ------ | ------------------ |
| Uptime                | 99.9%  | 99.5%              |
| Error Rate            | <1%    | <5%                |
| Mean Time to Recovery | <1h    | <4h                |
| Deployment Frequency  | Daily  | Weekly             |
| Change Failure Rate   | <5%    | <15%               |
| Lead Time for Changes | <1 day | <1 week            |

### 6.3 Business Metrics (Updated for 5-Family Beta)

| Metric            | Beta (Week 16) | Month 1 | Month 3 |
| ----------------- | -------------- | ------- | ------- |
| Active Families   | **5**          | 10      | 30      |
| Groups Created    | **1**          | 3       | 10      |
| Trips Scheduled   | **20**         | 60      | 300     |
| User Satisfaction | 4/5            | 4.5/5   | 4.7/5   |
| Support Tickets   | <5/week        | <8/week | <5/week |

**Rationale for 5-Family Beta** (User Decision):

- Lower risk during initial deployment
- More manageable direct communication
- Faster iteration on feedback
- Gradual expansion after 2-week validation

---

## Part 7: Risk Assessment & Mitigation

### High-Risk Items

#### 1. Timeline Overrun

**Risk**: 16-week timeline may slip  
**Probability**: MEDIUM  
**Impact**: HIGH  
**Mitigation**:

- Weekly progress reviews
- Flexible scope (AI integration deferred)
- Parallel workstreams where possible
- Scope-cut to 5 families reduces launch pressure

#### 2. Data Migration Failure

**Risk**: ~~Production data corruption during migration~~  
**Status**: ELIMINATED (User Decision)  
**Rationale**: Delete and recreate infrastructure - no migration needed

**New Risk**: Test user re-enrollment required  
**Probability**: LOW  
**Impact**: LOW  
**Mitigation**: Coordinate with 5 beta families for fresh registration

#### 3. User Adoption Issues

**Risk**: Families don't adopt the platform  
**Probability**: LOW (with 5-family beta)  
**Impact**: MEDIUM  
**Mitigation**:

- Personal onboarding for each family
- Direct communication channel (Slack/Discord)
- Rapid iteration on feedback
- 2-week validation before expansion

#### 4. Performance Issues

**Risk**: System slow under real load  
**Probability**: LOW (5 families = minimal load)  
**Impact**: LOW initially, MEDIUM at scale  
**Mitigation**:

- Performance testing before expansion
- Cosmos DB partition keys fixed
- Fresh infrastructure eliminates drift
- Monitor RU consumption closely

---

## Part 8: Cost Estimation

### Azure Resources (Monthly)

| Resource                     | SKU               | Cost (USD)         |
| ---------------------------- | ----------------- | ------------------ |
| Function App                 | Flex Consumption  | $50-100            |
| Static Web App               | Standard          | $10                |
| Cosmos DB                    | Serverless (10GB) | $25-50             |
| Application Insights         | Pay-as-you-go     | $20                |
| Key Vault                    | Standard          | $5                 |
| Storage Account              | Standard          | $5                 |
| Azure Communication Services | Pay-per-use       | $10-20             |
| **Total (Production)**       |                   | **$125-210/month** |

### Development Costs

| Phase                      | Duration     | Estimated Cost |
| -------------------------- | ------------ | -------------- |
| Security & Auth            | 3 weeks      | $15,000        |
| Architecture Consolidation | 5 weeks      | $25,000        |
| Deployment & DevOps        | 2 weeks      | $10,000        |
| Testing & Quality          | 4 weeks      | $20,000        |
| Production Launch          | 2 weeks      | $10,000        |
| **Total**                  | **16 weeks** | **$80,000**    |

_(Based on $5,000/week senior engineer cost)_

---

## Conclusion

### Current State Summary (Updated from Deep-Dive, May 2025)

The Carpool Management System is a **feature-complete but not production-ready** application with:

- ✅ 100% PRD features implemented
- ✅ Solid technical foundation (TypeScript, Azure, Next.js)
- ✅ **698 backend tests, 388 frontend tests** (1,086 total)
- ✅ **75.5% backend test coverage**
- ✅ **JWKS already implemented** (but has legacy fallback path)
- ⚠️ **~30% frontend test coverage** (critical gap)
- ⚠️ **3 competing auth stores** (not 2 as previously thought)
- ⚠️ **68 function directories** (not 90+, but still needs consolidation)
- ⚠️ **Cosmos DB partition key mismatch** (users partitioned by /id, queried by email)
- ❌ No deployment automation
- ❌ E2E tests exist (21 specs) but not in CI pipeline

### Key Decisions Made

| Decision       | Original         | Updated                 | Rationale                      |
| -------------- | ---------------- | ----------------------- | ------------------------------ |
| Beta Target    | 20 families      | **5 families**          | Lower risk, faster iteration   |
| Infrastructure | Migrate/activate | **Delete & recreate**   | Clean partition keys, no drift |
| Auth Approach  | Unify 2 paths    | **Delete legacy paths** | Simpler than unifying          |
| Timeline       | 10-12 weeks      | **12-16 weeks**         | Realistic with scope cuts      |
| UX Non-Auth    | Block access     | **Preview mode**        | Better conversion              |

### Selected Path Forward

**Scope-Cut MVP Approach (Recommended)**

Based on deep-dive analysis and stakeholder decisions:

- **Duration**: 12-16 weeks (realistic timeline)
- **Cost**: $42,000-$106,000 engineering + $125-210/month Azure
- **Focus**: Security, consolidation, 5-family beta
- **Outcome**: Production-ready platform with clear expansion path
- **Risk**: Low-Medium (scope reduced, plan validated by deep-dive)

### Why This Approach Works

1. **Validated Foundation**: Deep-dive confirmed more code is correct than initially feared
2. **Clear Delete List**: 272 lines auth store, legacy config files, duplicate functions
3. **Simple Auth Story**: JWKS works - just delete legacy fallback
4. **Fresh Infrastructure**: Avoids migration complexity entirely
5. **5-Family Beta**: Allows intensive monitoring and rapid iteration
6. **Expansion Ready**: Clear path to 10 → 20 → 200 families

### Immediate Actions (Week 0)

Before starting Phase 1, execute these immediate actions:

```bash
# 1. Delete dead code (Part 1.5)
rm frontend/src/store/auth.store.ts           # Legacy password auth
rm frontend/src/store/auth.store.new.ts        # Unused, never imported
rm backend/src/config/configuration-manager.ts # Duplicate config
rm backend/src/config/configuration-manager.js # Generated duplicate

# 2. Remove legacy auth fallback path in jwt.service.ts (lines 151-182)

# 3. Update infra/main.bicep with corrected partition keys
```

### Success Criteria

| Phase   | Duration    | Success Criteria                                |
| ------- | ----------- | ----------------------------------------------- |
| Phase 1 | Weeks 1-4   | Security audit passes, single auth path         |
| Phase 2 | Weeks 5-8   | 68→15 endpoints, single config/database service |
| Phase 3 | Weeks 9-10  | CI/CD operational, infrastructure deployed      |
| Phase 4 | Weeks 11-14 | 85% backend / 70% frontend coverage, E2E in CI  |
| Phase 5 | Weeks 15-16 | **5 families active, 0 critical bugs**          |

**Next Steps**:

1. ✅ Deep-dive complete, recommendations accepted
2. ⏳ Execute immediate actions (Week 0)
3. ⏳ Begin Phase 1: Security & Authentication
4. ⏳ Weekly progress reviews

---

**Document Approval**:

- [x] Deep-Dive Analysis Complete
- [x] User Decisions Documented
- [ ] Budget Approval
- [ ] Timeline Commitment

**Version History**:

- v1.0 (2026-01-19): Initial comprehensive analysis and roadmap
- v2.0 (2026-02-15): Added infrastructure activation plan
- **v3.0 (2025-05-XX)**: Updated with deep-dive findings, accurate test counts, user decisions (5-family beta, delete/recreate infrastructure, delete legacy auth paths)
