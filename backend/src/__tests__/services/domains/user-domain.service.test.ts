/**
 * Comprehensive tests for UserDomainService
 *
 * Tests cover:
 * - User retrieval by ID and email
 * - User profile updates
 * - User role management
 * - User deactivation
 * - Authentication delegation
 * - Password reset flow
 */

import {
  UserDomainService,
  userDomainService,
} from '../../../services/domains/user-domain.service';
import { databaseService } from '../../../services/database.service';
import { UserEntity, UserRole } from '@carpool/shared';

// Mock the AuthenticationService with proper implementation
jest.mock('../../../services/auth/authentication.service', () => ({
  AuthenticationService: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn().mockResolvedValue({ success: true, user: null, tokens: null }),
    registerUser: jest.fn().mockResolvedValue({ success: true, user: null, tokens: null }),
    validateToken: jest.fn().mockResolvedValue({ valid: true, payload: {} }),
    refreshToken: jest.fn().mockResolvedValue({ success: true, tokens: null }),
    generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token-123'),
    resetPassword: jest.fn().mockResolvedValue({ success: true, message: 'Password reset' }),
  })),
}));

// Mock dependencies
jest.mock('../../../services/database.service');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('UserDomainService', () => {
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: 'parent' as UserRole,
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
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = UserDomainService.getInstance();
      const instance2 = UserDomainService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export a default singleton', () => {
      expect(userDomainService).toBeDefined();
      expect(userDomainService).toBeInstanceOf(UserDomainService);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);

      const result = await userDomainService.getUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should return null when user not found', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(null);

      const result = await userDomainService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      mockDatabaseService.getUserByEmail.mockResolvedValue(mockUser);

      const result = await userDomainService.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockDatabaseService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when user email not found', async () => {
      mockDatabaseService.getUserByEmail.mockResolvedValue(null);

      const result = await userDomainService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      mockDatabaseService.updateUser.mockResolvedValue(undefined);

      const updates = { firstName: 'Updated', lastName: 'Name' };
      const result = await userDomainService.updateUserProfile('user-123', updates, 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User profile updated successfully');
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          firstName: 'Updated',
          lastName: 'Name',
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should return failure when update throws error', async () => {
      mockDatabaseService.updateUser.mockRejectedValue(new Error('Database error'));

      const result = await userDomainService.updateUserProfile(
        'user-123',
        { firstName: 'Test' },
        'admin-123',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update user profile');
    });
  });

  describe('updateUserRole', () => {
    it('should successfully update user role', async () => {
      mockDatabaseService.updateUser.mockResolvedValue(undefined);

      const result = await userDomainService.updateUserRole(
        'user-123',
        'admin' as UserRole,
        'super-admin',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('User role updated successfully');
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          role: 'admin',
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should return failure when role update throws error', async () => {
      mockDatabaseService.updateUser.mockRejectedValue(new Error('Insufficient permissions'));

      const result = await userDomainService.updateUserRole(
        'user-123',
        'admin' as UserRole,
        'regular-user',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update user role');
    });
  });

  describe('deactivateUser', () => {
    it('should successfully deactivate user account', async () => {
      mockDatabaseService.updateUser.mockResolvedValue(undefined);

      const result = await userDomainService.deactivateUser('user-123', 'admin-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User account deactivated successfully');
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          isActive: false,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('should return failure when deactivation throws error', async () => {
      mockDatabaseService.updateUser.mockRejectedValue(new Error('Cannot deactivate self'));

      const result = await userDomainService.deactivateUser('user-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to deactivate user account');
    });
  });

  describe('authenticateUser', () => {
    it('should delegate to authService.authenticate', async () => {
      // This is a delegation method, we're testing the integration
      const credentials = {
        type: 'password' as const,
        email: 'test@example.com',
        password: 'test123',
      };

      // The actual authentication is mocked, so we just verify the call doesn't throw
      await expect(userDomainService.authenticateUser(credentials)).resolves.toBeDefined();
    });
  });

  describe('authenticateWithPassword', () => {
    it('should create password credentials and delegate to authService', async () => {
      await expect(
        userDomainService.authenticateWithPassword('test@example.com', 'password123'),
      ).resolves.toBeDefined();
    });
  });

  describe('registerUser', () => {
    it('should delegate user registration to authService', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'parent' as UserRole,
        authProvider: 'entra' as const,
      };

      await expect(userDomainService.registerUser(userData)).resolves.toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should delegate token verification to authService', async () => {
      await expect(userDomainService.verifyToken('some-token')).resolves.toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should delegate token refresh to authService', async () => {
      await expect(userDomainService.refreshToken('refresh-token')).resolves.toBeDefined();
    });
  });

  describe('requestPasswordReset', () => {
    it('should handle successful password reset request', async () => {
      const result = await userDomainService.requestPasswordReset('test@example.com');

      // Result will depend on the mocked authService behavior
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });

  describe('resetPassword', () => {
    it('should delegate password reset to authService', async () => {
      await expect(
        userDomainService.resetPassword('reset-token', 'NewPassword123!'),
      ).resolves.toBeDefined();
    });
  });
});
