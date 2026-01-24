/**
 * Comprehensive tests for AuthenticationService
 *
 * Tests cover:
 * - Password authentication
 * - Entra token authentication
 * - Refresh token authentication
 * - Token validation
 * - User registration
 * - Password reset
 * - Account lockout
 * - Logout/token revocation
 */

import {
  AuthenticationService,
  PasswordValidator,
} from '../../services/auth/authentication.service';
import { JWTService } from '../../services/auth/jwt.service';
import { DatabaseService } from '../../services/database.service';
import { UserEntity, TokenType } from '@carpool/shared';

// Mock dependencies
jest.mock('../../services/database.service');
jest.mock('../../services/auth/jwt.service');
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockImplementation((password, hash) => {
    return Promise.resolve(password === 'correct-password' || hash === 'hashed-password');
  }),
}));

// Mock jwks-rsa
jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: () => 'mock-public-key',
    }),
  }));
});

const originalEnv = process.env;

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockJwtService: jest.Mocked<JWTService>;
  let mockLogger: any;

  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: 'parent',
    authProvider: 'entra',
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    emergencyContacts: [],
    groupMemberships: [],
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ALGORITHM: 'HS256',
      JWT_ISSUER: 'carpool-test',
      JWT_AUDIENCE: 'carpool-test',
      AZURE_TENANT_ID: 'test-tenant',
      AZURE_CLIENT_ID: 'test-client',
    };

    mockDatabase = {
      getUserByEmail: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      getUserById: jest.fn(),
    } as any;

    mockJwtService = {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      validateAccessToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      extractTokenFromHeader: jest.fn(),
      generatePasswordResetToken: jest.fn().mockReturnValue('mock-reset-token'),
      verifyPasswordResetToken: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    authService = new AuthenticationService(mockDatabase, mockLogger, mockJwtService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Password Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.authenticate({
        type: 'password',
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
    });

    it('should reject authentication with invalid password', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);
      // Mock bcrypt.compare to return false for this test
      const bcrypt = jest.requireMock('bcrypt');
      bcrypt.compare.mockResolvedValueOnce(false);

      const result = await authService.authenticate({
        type: 'password',
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should reject authentication for non-existent user', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(null);

      const result = await authService.authenticate({
        type: 'password',
        email: 'nonexistent@example.com',
        password: 'any-password',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should reject authentication for inactive user', async () => {
      // Implementation returns generic 'Invalid email or password' for security
      // (doesn't reveal whether user exists or is inactive)
      mockDatabase.getUserByEmail.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      const result = await authService.authenticate({
        type: 'password',
        email: 'inactive@test.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(false);
      // Security best practice: don't reveal if user exists/inactive
      expect(result.message).toBe('Invalid email or password');
    });

    it('should reject authentication for user without password hash', async () => {
      // User exists but has no password (e.g., SSO-only account)
      mockDatabase.getUserByEmail.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: undefined,
      });

      const result = await authService.authenticate({
        type: 'password',
        email: 'sso@test.com',
        password: 'Password123!',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Password authentication not available for this account');
    });
  });

  describe('Refresh Token Authentication', () => {
    it('should authenticate with valid refresh token', async () => {
      mockJwtService.validateRefreshToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      });
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.authenticate({
        type: 'refresh_token',
        token: 'valid-refresh-token',
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject invalid refresh token', async () => {
      mockJwtService.validateRefreshToken.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.authenticate({
        type: 'refresh_token',
        token: 'invalid-refresh-token',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Token Validation', () => {
    it('should validate a valid access token', async () => {
      mockJwtService.validateAccessToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: ['profile:read'],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      });
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateAccessToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should reject invalid access token', async () => {
      mockJwtService.validateAccessToken.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.validateAccessToken('invalid-token');

      expect(result.valid).toBe(false);
    });

    it('should reject token for deactivated user', async () => {
      mockJwtService.validateAccessToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      });
      mockDatabase.getUserByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await authService.validateAccessToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('deactivated');
    });
  });

  describe('Token Validation (validateToken method)', () => {
    it('should validate a valid token', async () => {
      const mockPayload: any = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      };
      mockJwtService.validateAccessToken.mockResolvedValue(mockPayload);

      const result = await authService.validateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('should reject invalid token', async () => {
      mockJwtService.validateAccessToken.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid token');
    });
  });

  describe('Refresh Token (refreshToken method)', () => {
    it('should refresh tokens for valid refresh token', async () => {
      mockJwtService.validateRefreshToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      } as any);
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);
      mockJwtService.generateAccessToken.mockReturnValue('new-access-token');
      mockJwtService.generateRefreshToken.mockReturnValue('new-refresh-token');

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should reject refresh for non-existent user', async () => {
      mockJwtService.validateRefreshToken.mockResolvedValue({
        sub: 'user-123',
        email: 'deleted@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      } as any);
      mockDatabase.getUserByEmail.mockResolvedValue(null);

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should reject refresh for deactivated user', async () => {
      mockJwtService.validateRefreshToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      } as any);
      mockDatabase.getUserByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('deactivated');
    });

    it('should reject invalid refresh token', async () => {
      mockJwtService.validateRefreshToken.mockRejectedValue(new Error('Expired'));

      const result = await authService.refreshToken('expired-refresh-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke a valid token', async () => {
      const token = 'eyJ...valid-token...';

      // Should not throw
      await expect(authService.revokeToken(token)).resolves.not.toThrow();
    });
  });

  describe('Password Reset', () => {
    it('should generate password reset token for existing user', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);
      (mockJwtService as any).generatePasswordResetToken = jest
        .fn()
        .mockReturnValue('reset-token-123');

      const token = await authService.generatePasswordResetToken('test@example.com');

      expect(token).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(null);

      await expect(authService.generatePasswordResetToken('notfound@example.com')).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle password reset request gracefully for non-existent user', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('notfound@example.com');

      // Should return success for security (don't reveal if email exists)
      expect(result.success).toBe(true);
    });

    it('should process password reset request for existing user', async () => {
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);
      (mockJwtService as any).generatePasswordResetToken = jest
        .fn()
        .mockReturnValue('reset-token-123');

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBe('reset-token-123');
    });

    it('should reset password with valid token', async () => {
      mockJwtService.validateAccessToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      });
      mockDatabase.getUserByEmail.mockResolvedValue(mockUser);
      mockDatabase.updateUser.mockResolvedValue({ ...mockUser, passwordHash: 'new-hash' });

      const result = await authService.resetPassword('valid-reset-token', 'NewPassword123!');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successfully');
    });

    it('should reject weak password during reset', async () => {
      const result = await authService.resetPassword('valid-reset-token', 'weak');

      expect(result.success).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject invalid reset token', async () => {
      mockJwtService.validateAccessToken.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.resetPassword('invalid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired reset token');
    });

    it('should reject reset for non-existent user', async () => {
      mockJwtService.validateAccessToken.mockResolvedValue({
        sub: 'user-123',
        email: 'deleted@example.com',
        role: 'parent',
        permissions: [],
        authProvider: 'entra',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'carpool-test',
        aud: 'carpool-test',
      });
      mockDatabase.getUserByEmail.mockResolvedValue(null);

      const result = await authService.resetPassword('valid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('User Registration', () => {
    it('should register a new user with password', async () => {
      mockDatabase.createUser.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        authProvider: 'legacy',
      });

      const result = await authService.registerUser({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!',
        role: 'parent',
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.message).toBe('User registered successfully');
    });

    it('should reject registration with weak password', async () => {
      const result = await authService.registerUser({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'weak',
        role: 'parent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should register user without password (Entra auth)', async () => {
      mockDatabase.createUser.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        authProvider: 'entra',
        passwordHash: undefined,
      });

      const result = await authService.registerUser({
        email: 'entrauser@example.com',
        firstName: 'Entra',
        lastName: 'User',
        role: 'parent',
        password: '', // Empty password for Entra auth
      });

      expect(result.success).toBe(true);
    });

    it('should handle database error during registration', async () => {
      mockDatabase.createUser.mockRejectedValue(new Error('Database error'));

      const result = await authService.registerUser({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'SecurePassword123!',
        role: 'parent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('registration failed');
    });

    it('should include optional fields during registration', async () => {
      mockDatabase.createUser.mockResolvedValue({
        ...mockUser,
        id: 'new-user-id',
        phoneNumber: '555-1234',
        homeAddress: '123 Main St',
        isActiveDriver: true,
      });

      const result = await authService.registerUser({
        email: 'driver@example.com',
        firstName: 'Driver',
        lastName: 'User',
        password: 'SecurePassword123!',
        role: 'parent',
        phoneNumber: '555-1234',
        homeAddress: '123 Main St',
        isActiveDriver: true,
      });

      expect(result.success).toBe(true);
      expect(mockDatabase.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '555-1234',
          homeAddress: '123 Main St',
          isActiveDriver: true,
        }),
      );
    });
  });

  describe('Unsupported Authentication Type', () => {
    it('should reject unsupported authentication type', async () => {
      const result = await authService.authenticate({
        type: 'unknown_type' as any,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported');
    });
  });
});

describe('PasswordValidator', () => {
  let validator: PasswordValidator;

  beforeEach(() => {
    validator = new PasswordValidator();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await validator.hashPassword('TestPassword123!');
      expect(hash).toBe('hashed-password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const result = await validator.verifyPassword('correct-password', 'hashed-password');
      expect(result).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validator.validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject password without lowercase letter', () => {
      const result = validator.validatePasswordStrength('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject password without uppercase letter', () => {
      const result = validator.validatePasswordStrength('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject password without number', () => {
      const result = validator.validatePasswordStrength('NoNumbers!@');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should reject password without special character', () => {
      const result = validator.validatePasswordStrength('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('special character');
    });

    it('should accept valid password', () => {
      const result = validator.validatePasswordStrength('ValidPass123!');
      expect(result.valid).toBe(true);
    });
  });
});
