/**
 * Auth Service Tests
 * 
 * Comprehensive test suite for AuthService to improve backend test coverage.
 * Tests authentication, JWT management, password operations, and token handling.
 */

import { AuthService } from '../../services/auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { User, UserRole } from '@vcarpool/shared';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../repositories/user.repository');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Helper function to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@teslaSTEM.org',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  role: 'parent',
  preferences: {
    pickupLocation: '123 Main St',
    dropoffLocation: '456 School Ave',
    preferredTime: '08:00',
    isDriver: false,
    smokingAllowed: false,
    notifications: {
      email: true,
      sms: false,
      tripReminders: true,
      swapRequests: true,
      scheduleChanges: true,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper function to create mock user record with password hash
const createMockUserRecord = (overrides: Partial<User> = {}): any => ({
  ...createMockUser(overrides),
  passwordHash: '$2a$10$hashedpassword',
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: Partial<jest.Mocked<UserRepository>>;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock repository
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      query: jest.fn(),
    } as Partial<jest.Mocked<UserRepository>>;

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Initialize service
    authService = new AuthService(mockUserRepository as jest.Mocked<UserRepository>, mockLogger);

    // Setup default mock implementations
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', email: 'test@teslaSTEM.org' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedpassword');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@teslaSTEM.org',
        password: 'SecurePassword123!',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        role: 'parent' as UserRole,
      };

      const expectedUser = createMockUser({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
      });

      mockUserRepository.create!.mockResolvedValue(expectedUser);

      const result = await authService.register(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', userData.email);
      expect(result).toHaveProperty('firstName', userData.firstName);
      expect(result).toHaveProperty('lastName', userData.lastName);
      expect(result).toHaveProperty('role', userData.role);
    });

    it('should handle password hashing errors', async () => {
      const userData = {
        email: 'newuser@teslaSTEM.org',
        password: 'SecurePassword123!',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        role: 'parent' as UserRole,
      };

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(authService.register(userData)).rejects.toThrow('Hashing failed');
    });

    it('should handle repository errors during creation', async () => {
      const userData = {
        email: 'newuser@teslaSTEM.org',
        password: 'SecurePassword123!',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        role: 'parent' as UserRole,
      };

      mockUserRepository.create!.mockRejectedValue(new Error('Database error'));

      await expect(authService.register(userData)).rejects.toThrow('Database error');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials = {
        email: 'test@teslaSTEM.org',
        password: 'correctpassword',
      };

      const userRecord = createMockUserRecord();
      mockUserRepository.findByEmail!.mockResolvedValue(userRecord);

      const result = await authService.login(credentials.email, credentials.password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, userRecord.passwordHash);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findByEmail!.mockResolvedValue(null);

      await expect(authService.login('nonexistent@teslaSTEM.org', 'password')).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      const userRecord = createMockUserRecord();
      mockUserRepository.findByEmail!.mockResolvedValue(userRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@teslaSTEM.org', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });

    it('should handle bcrypt errors', async () => {
      const userRecord = createMockUserRecord();
      mockUserRepository.findByEmail!.mockResolvedValue(userRecord);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(authService.login('test@teslaSTEM.org', 'password')).rejects.toThrow('Bcrypt error');
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findByEmail!.mockRejectedValue(new Error('Database error'));

      await expect(authService.login('test@teslaSTEM.org', 'password')).rejects.toThrow('Database error');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token successfully', () => {
      const mockPayload = { userId: 'user-123', email: 'test@teslaSTEM.org', role: 'parent', permissions: [] };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyAccessToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET || 'default-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyAccessToken('invalid-token')).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      expect(() => authService.verifyAccessToken('expired-token')).toThrow('Invalid or expired token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token successfully', () => {
      const mockPayload = { userId: 'user-123', email: 'test@teslaSTEM.org', role: 'parent', permissions: [] };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyRefreshToken('valid-refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', process.env.JWT_REFRESH_SECRET || 'default-refresh-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid refresh token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid refresh token');
      });

      expect(() => authService.verifyRefreshToken('invalid-refresh-token')).toThrow('Invalid or expired refresh token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const mockPayload = { userId: 'user-123', email: 'test@teslaSTEM.org', role: 'parent', permissions: [] };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      
      const user = createMockUser();
      mockUserRepository.findById!.mockResolvedValue(user);

      const result = await authService.refreshAccessToken('valid-refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', process.env.JWT_REFRESH_SECRET || 'default-refresh-secret');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw error if user not found during refresh', async () => {
      const mockPayload = { userId: 'user-123', email: 'test@teslaSTEM.org', role: 'parent', permissions: [] };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findById!.mockResolvedValue(null);

      await expect(authService.refreshAccessToken('valid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should handle invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshAccessToken('invalid-refresh-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userRecord = createMockUserRecord();
      mockUserRepository.findById!.mockResolvedValue(userRecord);
      mockUserRepository.update!.mockResolvedValue(createMockUser());

      await authService.changePassword('user-123', 'oldPassword', 'newPassword123!');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', userRecord.passwordHash);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123!', 12);
      expect(mockUserRepository.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findById!.mockResolvedValue(null);

      await expect(authService.changePassword('user-123', 'oldPassword', 'newPassword')).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      const userRecord = createMockUserRecord();
      mockUserRepository.findById!.mockResolvedValue(userRecord);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword('user-123', 'wrongPassword', 'newPassword')).rejects.toThrow('Invalid current password');
    });
  });

  describe('generateAccessTokenInstance', () => {
    it('should generate access token', () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockReturnValue('access-token');

      const result = authService.generateAccessTokenInstance(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          role: user.role,
          permissions: expect.any(Array),
        }),
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );
      expect(result).toBe('access-token');
    });
  });

  describe('generateRefreshTokenInstance', () => {
    it('should generate refresh token', () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockReturnValue('refresh-token');

      const result = authService.generateRefreshTokenInstance(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          role: user.role,
          permissions: expect.any(Array),
        }),
        process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe('refresh-token');
    });
  });

  describe('hashPasswordInstance', () => {
    it('should hash password successfully', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');

      const result = await authService.hashPasswordInstance('password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBe('$2a$12$hashedpassword');
    });

    it('should handle hashing errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hashing failed'));

      await expect(authService.hashPasswordInstance('password123')).rejects.toThrow('Hashing failed');
    });
  });

  describe('verifyPasswordInstance', () => {
    it('should verify password successfully', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyPasswordInstance('password123', '$2a$12$hash');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2a$12$hash');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.verifyPasswordInstance('wrongpassword', '$2a$12$hash');

      expect(result).toBe(false);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const result = authService.extractTokenFromHeader('Bearer token123');

      expect(result).toBe('token123');
    });

    it('should return null for invalid header format', () => {
      expect(authService.extractTokenFromHeader('InvalidFormat token123')).toBeNull();
      expect(authService.extractTokenFromHeader('Bearer')).toBeNull();
      expect(authService.extractTokenFromHeader('')).toBeNull();
      expect(authService.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate password reset token', async () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockReturnValue('reset-token');

      const result = await authService.generatePasswordResetToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: user.id },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '1h' }
      );
      expect(result).toBe('reset-token');
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify password reset token', () => {
      const mockPayload = { userId: 'user-123' };
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyPasswordResetToken('reset-token');

      expect(jwt.verify).toHaveBeenCalledWith('reset-token', process.env.JWT_SECRET || 'default-secret');
      expect(result).toEqual(mockPayload);
    });

    it('should handle invalid reset token', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => authService.verifyPasswordResetToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with default salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$12$hashedpassword');

      const result = await authService.hashPassword('password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBe('$2a$12$hashedpassword');
    });
  });

  describe('Static Methods', () => {
    it('should generate access token using static method', () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockReturnValue('static-access-token');

      const result = AuthService.generateAccessToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          role: user.role,
          permissions: expect.any(Array),
        }),
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' }
      );
      expect(result).toBe('static-access-token');
    });

    it('should generate refresh token using static method', () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockReturnValue('static-refresh-token');

      const result = AuthService.generateRefreshToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          email: user.email,
          role: user.role,
          permissions: expect.any(Array),
        }),
        process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe('static-refresh-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT signing errors', () => {
      const user = createMockUser();
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      expect(() => authService.generateAccessTokenInstance(user)).toThrow('JWT signing failed');
    });

    it('should handle malformed tokens', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('jwt malformed');
        (error as any).name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => authService.verifyAccessToken('malformed-token')).toThrow('Invalid or expired token');
    });
  });
});
