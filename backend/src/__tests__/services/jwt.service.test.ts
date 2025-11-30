/**
 * Comprehensive tests for JWTService
 *
 * Tests cover:
 * - Token generation (access, refresh, password reset)
 * - Token validation (internal and Entra ID)
 * - Token extraction from headers
 * - Role-based permissions
 * - Error handling
 */

import * as jwt from 'jsonwebtoken';
import { JWTService } from '../../services/auth/jwt.service';
import { UserEntity, TokenType } from '@carpool/shared';

// Mock jwks-rsa
jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockImplementation((kid: string) => {
      if (kid === 'valid-kid') {
        return Promise.resolve({
          getPublicKey: () => 'mock-public-key',
        });
      }
      return Promise.reject(new Error('Key not found'));
    }),
  }));
});

// Mock environment variables
const originalEnv = process.env;

describe('JWTService', () => {
  let jwtService: JWTService;

  // Test user fixtures
  const mockParentUser: UserEntity = {
    id: 'user-123',
    email: 'parent@test.com',
    firstName: 'Test',
    lastName: 'Parent',
    role: 'parent',
    authProvider: 'entra',
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    emergencyContacts: [],
    groupMemberships: [
      {
        id: 'membership-1',
        groupId: 'group-1',
        userId: 'user-123',
        role: 'parent',
        status: 'active',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        children: [],
        metrics: {
          totalTripsCompleted: 0,
          totalTripsAsDriver: 0,
          totalTripsAsPassenger: 0,
          reliabilityScore: 100,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    familyId: 'family-123',
    addressVerified: true,
    isActiveDriver: true,
    preferences: {
      isDriver: true,
      notifications: {
        email: true,
        sms: false,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    loginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser: UserEntity = {
    ...mockParentUser,
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'super_admin',
  };

  const mockGroupAdminUser: UserEntity = {
    ...mockParentUser,
    id: 'gadmin-123',
    email: 'groupadmin@test.com',
    role: 'group_admin',
  };

  const mockStudentUser: UserEntity = {
    ...mockParentUser,
    id: 'student-123',
    email: 'student@test.com',
    role: 'student',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-purposes',
      AZURE_TENANT_ID: 'test-tenant-id',
      AZURE_CLIENT_ID: 'test-client-id',
      JWT_ALGORITHM: 'HS256', // Use HS256 for testing with symmetric secrets
      JWT_ISSUER: 'carpool-test', // Use custom issuer so tokens aren't confused with Entra ID
      JWT_AUDIENCE: 'carpool-test-audience',
    };
    jwtService = new JWTService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Token Generation', () => {
    describe('generateAccessToken', () => {
      it('should generate a valid access token for a parent user', () => {
        const token = jwtService.generateAccessToken(mockParentUser);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT format

        const decoded = jwt.decode(token) as any;
        expect(decoded.sub).toBe(mockParentUser.id);
        expect(decoded.email).toBe(mockParentUser.email);
        expect(decoded.role).toBe('parent');
        expect(decoded.type).toBe(TokenType.ACCESS);
      });

      it('should generate a valid access token for an admin user', () => {
        const token = jwtService.generateAccessToken(mockAdminUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBe('super_admin');
        expect(decoded.permissions).toContain('admin:read');
        expect(decoded.permissions).toContain('admin:write');
        expect(decoded.permissions).toContain('system:manage');
      });

      it('should generate a valid access token for a group admin', () => {
        const token = jwtService.generateAccessToken(mockGroupAdminUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBe('group_admin');
        expect(decoded.permissions).toContain('groups:read');
        expect(decoded.permissions).toContain('groups:manage_own');
      });

      it('should generate a valid access token for a student', () => {
        const token = jwtService.generateAccessToken(mockStudentUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.role).toBe('student');
        expect(decoded.permissions).toContain('profile:read');
        expect(decoded.permissions).toContain('trips:read');
        expect(decoded.permissions).not.toContain('admin:read');
      });

      it('should include familyId in the token', () => {
        const token = jwtService.generateAccessToken(mockParentUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.familyId).toBe('family-123');
      });

      it('should include group memberships in the token', () => {
        const token = jwtService.generateAccessToken(mockParentUser);
        const decoded = jwt.decode(token) as any;

        expect(decoded.groupMemberships).toContain('group-1');
      });

      it('should handle user with no group memberships', () => {
        const userWithNoGroups = { ...mockParentUser, groupMemberships: undefined };
        const token = jwtService.generateAccessToken(userWithNoGroups);
        const decoded = jwt.decode(token) as any;

        expect(decoded.groupMemberships).toEqual([]);
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a valid refresh token', () => {
        const token = jwtService.generateRefreshToken(mockParentUser);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');

        const decoded = jwt.decode(token) as any;
        expect(decoded.sub).toBe(mockParentUser.id);
        expect(decoded.email).toBe(mockParentUser.email);
        expect(decoded.type).toBe(TokenType.REFRESH);
      });

      it('should not include sensitive data in refresh token', () => {
        const token = jwtService.generateRefreshToken(mockParentUser);
        const decoded = jwt.decode(token) as any;

        // Refresh tokens shouldn't have detailed group membership data
        expect(decoded.groupMemberships).toBeUndefined();
        expect(decoded.familyId).toBeUndefined();
      });
    });

    describe('generatePasswordResetToken', () => {
      it('should generate a valid password reset token', () => {
        const token = jwtService.generatePasswordResetToken(mockParentUser);

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');

        const decoded = jwt.decode(token) as any;
        expect(decoded.sub).toBe(mockParentUser.id);
        expect(decoded.email).toBe(mockParentUser.email);
        expect(decoded.type).toBe(TokenType.PASSWORD_RESET);
      });

      it('should have short expiry for password reset token', () => {
        const token = jwtService.generatePasswordResetToken(mockParentUser);
        const decoded = jwt.decode(token) as any;

        // Password reset tokens should expire within 15 minutes
        const expectedMaxExp = Math.floor(Date.now() / 1000) + 15 * 60 + 10; // 15 min + buffer
        expect(decoded.exp).toBeLessThanOrEqual(expectedMaxExp);
      });
    });
  });

  describe('Token Validation', () => {
    describe('validateAccessToken - Internal Tokens', () => {
      it('should validate a valid internal access token', async () => {
        const token = jwtService.generateAccessToken(mockParentUser);
        const payload = await jwtService.validateAccessToken(token);

        expect(payload.sub).toBe(mockParentUser.id);
        expect(payload.email).toBe(mockParentUser.email);
        expect(payload.role).toBe('parent');
      });

      it('should reject an invalid token', async () => {
        await expect(jwtService.validateAccessToken('invalid-token')).rejects.toThrow();
      });

      it('should reject a token with wrong type', async () => {
        const refreshToken = jwtService.generateRefreshToken(mockParentUser);
        await expect(jwtService.validateAccessToken(refreshToken)).rejects.toThrow(
          'Token validation failed',
        );
      });

      it('should reject an expired token', async () => {
        // Create a token that's already expired
        const expiredToken = jwt.sign(
          {
            sub: mockParentUser.id,
            email: mockParentUser.email,
            role: mockParentUser.role,
            type: TokenType.ACCESS,
            iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
            exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
          },
          process.env.JWT_SECRET!,
        );

        await expect(jwtService.validateAccessToken(expiredToken)).rejects.toThrow();
      });
    });

    describe('validateRefreshToken', () => {
      it('should validate a valid refresh token', async () => {
        const token = jwtService.generateRefreshToken(mockParentUser);
        const payload = await jwtService.validateRefreshToken(token);

        expect(payload.sub).toBe(mockParentUser.id);
        expect(payload.email).toBe(mockParentUser.email);
      });

      it('should reject an access token used as refresh token', async () => {
        const accessToken = jwtService.generateAccessToken(mockParentUser);
        await expect(jwtService.validateRefreshToken(accessToken)).rejects.toThrow(
          'Refresh token validation failed',
        );
      });

      it('should reject an invalid refresh token', async () => {
        await expect(jwtService.validateRefreshToken('invalid-token')).rejects.toThrow();
      });
    });

    describe('verifyPasswordResetToken', () => {
      it('should verify a valid password reset token', () => {
        const token = jwtService.generatePasswordResetToken(mockParentUser);
        const payload = jwtService.verifyPasswordResetToken(token);

        expect(payload.sub).toBe(mockParentUser.id);
        expect(payload.email).toBe(mockParentUser.email);
        expect(payload.type).toBe(TokenType.PASSWORD_RESET);
      });

      it('should reject an access token used as password reset token', () => {
        const accessToken = jwtService.generateAccessToken(mockParentUser);
        expect(() => jwtService.verifyPasswordResetToken(accessToken)).toThrow(
          'Invalid or expired password reset token',
        );
      });

      it('should reject an invalid password reset token', () => {
        expect(() => jwtService.verifyPasswordResetToken('invalid-token')).toThrow();
      });
    });
  });

  describe('Token Extraction', () => {
    describe('extractTokenFromHeader', () => {
      it('should extract token from valid Bearer header', () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
        const header = `Bearer ${token}`;

        const extracted = jwtService.extractTokenFromHeader(header);
        expect(extracted).toBe(token);
      });

      it('should return null for missing header', () => {
        expect(jwtService.extractTokenFromHeader(undefined)).toBeNull();
      });

      it('should return null for empty header', () => {
        expect(jwtService.extractTokenFromHeader('')).toBeNull();
      });

      it('should return null for header without Bearer prefix', () => {
        expect(jwtService.extractTokenFromHeader('token123')).toBeNull();
      });

      it('should return null for Basic auth header', () => {
        expect(jwtService.extractTokenFromHeader('Basic abc123')).toBeNull();
      });

      it('should handle Bearer with different casing', () => {
        // Bearer is case-sensitive per RFC 6750
        expect(jwtService.extractTokenFromHeader('bearer token123')).toBeNull();
      });
    });
  });

  describe('Role Permissions', () => {
    it('should assign correct permissions for super_admin', () => {
      const token = jwtService.generateAccessToken(mockAdminUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.permissions).toContain('admin:read');
      expect(decoded.permissions).toContain('admin:write');
      expect(decoded.permissions).toContain('admin:delete');
      expect(decoded.permissions).toContain('groups:manage');
      expect(decoded.permissions).toContain('users:manage');
      expect(decoded.permissions).toContain('system:manage');
    });

    it('should assign correct permissions for group_admin', () => {
      const token = jwtService.generateAccessToken(mockGroupAdminUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.permissions).toContain('groups:read');
      expect(decoded.permissions).toContain('groups:write');
      expect(decoded.permissions).toContain('groups:manage_own');
      expect(decoded.permissions).not.toContain('admin:write');
    });

    it('should assign correct permissions for parent', () => {
      const token = jwtService.generateAccessToken(mockParentUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.permissions).toContain('profile:read');
      expect(decoded.permissions).toContain('profile:write');
      expect(decoded.permissions).toContain('groups:read');
      expect(decoded.permissions).toContain('groups:join');
      expect(decoded.permissions).toContain('children:manage');
      expect(decoded.permissions).not.toContain('groups:manage');
    });

    it('should assign correct permissions for student', () => {
      const token = jwtService.generateAccessToken(mockStudentUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.permissions).toContain('profile:read');
      expect(decoded.permissions).toContain('trips:read');
      expect(decoded.permissions).not.toContain('profile:write');
      expect(decoded.permissions).not.toContain('children:manage');
    });

    it('should default to parent permissions for unknown role', () => {
      const unknownRoleUser = { ...mockParentUser, role: 'unknown_role' as any };
      const token = jwtService.generateAccessToken(unknownRoleUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.permissions).toContain('profile:read');
      expect(decoded.permissions).toContain('groups:read');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with minimal data', () => {
      const minimalUser: UserEntity = {
        id: 'min-user',
        email: 'minimal@test.com',
        firstName: 'Min',
        lastName: 'User',
        role: 'parent',
        authProvider: 'entra',
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        emergencyContacts: [],
        groupMemberships: [],
        addressVerified: false,
        isActiveDriver: false,
        preferences: {
          isDriver: false,
          notifications: {
            email: true,
            sms: false,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = jwtService.generateAccessToken(minimalUser);
      expect(token).toBeDefined();

      const decoded = jwt.decode(token) as any;
      expect(decoded.sub).toBe('min-user');
    });

    it('should generate different tokens for different users', () => {
      const token1 = jwtService.generateAccessToken(mockParentUser);
      const token2 = jwtService.generateAccessToken(mockAdminUser);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens on successive calls (due to iat)', async () => {
      const token1 = jwtService.generateAccessToken(mockParentUser);

      // Small delay to ensure different iat
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const token2 = jwtService.generateAccessToken(mockParentUser);

      // Tokens should be different due to iat timestamp
      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;
      expect(decoded1.iat).not.toBe(decoded2.iat);
    });
  });

  describe('Configuration', () => {
    it('should use default config when none provided', () => {
      const service = new JWTService();
      const token = service.generateAccessToken(mockParentUser);
      expect(token).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig = {
        accessTokenSecret: 'custom-secret',
        accessTokenExpiry: '2h',
      };
      const service = new JWTService(customConfig);
      const token = service.generateAccessToken(mockParentUser);
      expect(token).toBeDefined();
    });
  });

  describe('Entra ID Token Validation', () => {
    it('should attempt to validate token with microsoftonline issuer using JWKS', async () => {
      // Create a mock token that looks like an Entra ID token
      // We manually construct a JWT-like string since we can't sign with RS256 without a key
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'invalid-kid' })).toString(
        'base64url',
      );
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@vedprakash.net',
          iss: 'https://login.microsoftonline.com/test-tenant/v2.0',
          aud: 'test-client-id',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString('base64url');
      const signature = 'fake-signature';
      const entraToken = `${header}.${payload}.${signature}`;

      // Should fail because JWKS validation will fail with invalid key
      await expect(jwtService.validateAccessToken(entraToken)).rejects.toThrow();
    });

    it('should handle JWKS key not found error', async () => {
      // Construct a token-like string with microsoftonline issuer
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'nonexistent-kid' })).toString(
        'base64url',
      );
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@vedprakash.net',
          iss: 'https://login.microsoftonline.com/test-tenant/v2.0',
          aud: 'test-client-id',
        }),
      ).toString('base64url');
      const signature = 'fake-signature';
      const entraToken = `${header}.${payload}.${signature}`;

      await expect(jwtService.validateAccessToken(entraToken)).rejects.toThrow(
        'Entra ID token validation failed',
      );
    });
  });
});
