import { AuthService, JwtPayload } from '../../services/auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { User, UserRole } from '../../types/shared';
import { ILogger } from '../../utils/logger';
import { Errors } from '../../utils/error-handler';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '555-0123',
    role: UserRole.PARENT,
    preferences: {
      pickupLocation: '123 Main St',
      dropoffLocation: 'Test School',
      preferredTime: '08:00',
      isDriver: true,
      maxPassengers: 4,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: true,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create mocked dependencies
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByQuery: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    authService = new AuthService(mockUserRepository, mockLogger);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Static Methods', () => {
    describe('generateAccessToken', () => {
      it('should generate a valid access token', () => {
        const mockToken = 'mock-access-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        const result = AuthService.generateAccessToken(mockUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          {
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            permissions: expect.arrayContaining([
              'submit_preferences',
              'view_own_trips',
              'manage_children',
              'edit_profile',
              'view_group_schedule',
            ]),
          },
          expect.any(String),
          { expiresIn: '24h' },
        );
        expect(result).toBe(mockToken);
      });

      it('should include correct permissions for admin role', () => {
        const adminUser = { ...mockUser, role: 'admin' as UserRole };
        const mockToken = 'mock-admin-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        AuthService.generateAccessToken(adminUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            permissions: expect.arrayContaining([
              'create_users',
              'generate_schedule',
              'view_all_data',
              'manage_system',
              'manage_groups',
              'manage_roles',
            ]),
          }),
          expect.any(String),
          expect.any(Object),
        );
      });

      it('should include correct permissions for group_admin role', () => {
        const groupAdminUser = { ...mockUser, role: 'group_admin' as UserRole };
        const mockToken = 'mock-group-admin-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        AuthService.generateAccessToken(groupAdminUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            permissions: expect.arrayContaining([
              'manage_group',
              'assign_trips',
              'view_group_data',
              'manage_group_members',
              'submit_preferences',
            ]),
          }),
          expect.any(String),
          expect.any(Object),
        );
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a valid refresh token', () => {
        const mockRefreshToken = 'mock-refresh-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockRefreshToken);

        const result = AuthService.generateRefreshToken(mockUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          }),
          expect.any(String),
          { expiresIn: '7d' },
        );
        expect(result).toBe(mockRefreshToken);
      });
    });
  });

  describe('Instance Methods', () => {
    describe('generateAccessTokenInstance', () => {
      it('should generate access token using instance method', () => {
        const mockToken = 'instance-access-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);

        const result = authService.generateAccessTokenInstance(mockUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          }),
          expect.any(String),
          { expiresIn: '24h' },
        );
        expect(result).toBe(mockToken);
      });
    });

    describe('generateRefreshTokenInstance', () => {
      it('should generate refresh token using instance method', () => {
        const mockRefreshToken = 'instance-refresh-token';
        (jwt.sign as jest.Mock).mockReturnValue(mockRefreshToken);

        const result = authService.generateRefreshTokenInstance(mockUser);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          }),
          expect.any(String),
          { expiresIn: '7d' },
        );
        expect(result).toBe(mockRefreshToken);
      });
    });

    describe('hashPasswordInstance', () => {
      it('should hash password with bcrypt', async () => {
        const password = 'testPassword123';
        const hashedPassword = 'hashedPassword123';
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

        const result = await authService.hashPasswordInstance(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(hashedPassword);
      });
    });

    describe('verifyPasswordInstance', () => {
      it('should verify password correctly', async () => {
        const password = 'testPassword123';
        const hash = 'hashedPassword123';
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await authService.verifyPasswordInstance(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const password = 'wrongPassword';
        const hash = 'hashedPassword123';
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await authService.verifyPasswordInstance(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(false);
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify valid access token', () => {
        const token = 'valid-token';
        const payload: JwtPayload = {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'parent',
          permissions: ['submit_preferences'],
        };
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        const result = authService.verifyAccessToken(token);

        expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
        expect(result).toEqual(payload);
      });

      it('should throw error for invalid token', () => {
        const token = 'invalid-token';
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid token');
        });

        expect(() => authService.verifyAccessToken(token)).toThrow('Invalid or expired token');
      });
    });
  });

  describe('Role Permissions', () => {
    const testCases = [
      {
        role: 'admin' as UserRole,
        expectedPermissions: [
          'create_users',
          'generate_schedule',
          'view_all_data',
          'manage_system',
          'manage_groups',
          'manage_roles',
        ],
      },
      {
        role: 'group_admin' as UserRole,
        expectedPermissions: [
          'manage_group',
          'assign_trips',
          'view_group_data',
          'manage_group_members',
          'submit_preferences',
        ],
      },
      {
        role: 'parent' as UserRole,
        expectedPermissions: [
          'submit_preferences',
          'view_own_trips',
          'manage_children',
          'edit_profile',
          'view_group_schedule',
        ],
      },
      {
        role: 'child' as UserRole,
        expectedPermissions: ['view_own_schedule', 'update_limited_profile', 'view_assignments'],
      },
      {
        role: 'student' as UserRole,
        expectedPermissions: ['view_own_schedule', 'update_limited_profile', 'view_assignments'],
      },
      {
        role: 'trip_admin' as UserRole,
        expectedPermissions: [
          'manage_trip',
          'assign_passengers',
          'view_trip_data',
          'manage_trip_schedule',
          'submit_preferences',
        ],
      },
    ];

    testCases.forEach(({ role, expectedPermissions }) => {
      it(`should have correct permissions for ${role} role`, () => {
        const userWithRole = { ...mockUser, role };
        (jwt.sign as jest.Mock).mockReturnValue('mock-token');

        AuthService.generateAccessToken(userWithRole);

        const callArgs = (jwt.sign as jest.Mock).mock.calls[0];
        const payload = callArgs[0];

        // Check that all expected permissions are included
        expectedPermissions.forEach((permission) => {
          expect(payload.permissions).toContain(permission);
        });

        // Check that the role is correct
        expect(payload.role).toBe(role);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors gracefully', () => {
      const token = 'malformed-token';
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('JsonWebTokenError');
      });

      expect(() => authService.verifyAccessToken(token)).toThrow('Invalid or expired token');
    });

    it('should handle bcrypt errors in password hashing', async () => {
      const password = 'testPassword123';
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(authService.hashPasswordInstance(password)).rejects.toThrow('Bcrypt error');
    });

    it('should handle bcrypt errors in password verification', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword123';
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt compare error'));

      await expect(authService.verifyPasswordInstance(password, hash)).rejects.toThrow(
        'Bcrypt compare error',
      );
    });
  });

  describe('Token Expiration', () => {
    it('should use correct expiration for access tokens', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      AuthService.generateAccessToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), {
        expiresIn: '24h',
      });
    });

    it('should use correct expiration for refresh tokens', () => {
      (jwt.sign as jest.Mock).mockReturnValue('mock-refresh-token');

      AuthService.generateRefreshToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.any(String), {
        expiresIn: '7d',
      });
    });
  });
});
