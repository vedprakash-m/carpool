/**
 * User Service Tests
 * 
 * Comprehensive test suite for UserService to improve backend test coverage.
 * Tests core functionality including user creation, retrieval, updates, and preferences.
 */

import { UserService } from '../../services/user.service';
import { UserRepository } from '../../repositories/user.repository';
import { User, UserPreferences } from '@vcarpool/shared';

// Mock the repository
jest.mock('../../repositories/user.repository');

// Helper function to create mock user preferences
const createMockUserPreferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
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
  ...overrides,
});

// Helper function to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@teslaSTEM.org',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  role: 'parent',
  preferences: createMockUserPreferences(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockLogger: any;

  beforeEach(() => {
    // Create mock repository - use unknown to bypass type checking
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn().mockReturnThis(),
      startTimer: jest.fn(() => jest.fn()),
    };

    // Create service instance
    userService = new UserService(mockUserRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'test@teslaSTEM.org',
      passwordHash: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
    };

    it('should create a new user successfully', async () => {
      // Arrange
      const expectedUser = createMockUser({
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
        phoneNumber: validUserData.phoneNumber,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          phoneNumber: validUserData.phoneNumber,
          role: 'parent',
          passwordHash: validUserData.passwordHash,
        })
      );
      expect(result).toMatchObject({
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
        phoneNumber: validUserData.phoneNumber,
        role: 'parent',
      });
    });

    it('should throw error if user with email already exists', async () => {
      // Arrange
      const existingUser = createMockUser({
        email: validUserData.email,
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.createUser(validUserData)).rejects.toThrow('User with this email already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors during creation', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.createUser(validUserData)).rejects.toThrow('Database error');
    });

    it('should create user with default preferences and role', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createMockUser());

      // Act
      await userService.createUser(validUserData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'parent',
          preferences: expect.objectContaining({
            pickupLocation: '',
            dropoffLocation: '',
            preferredTime: '08:00',
            isDriver: false,
            smokingAllowed: false,
            notifications: expect.objectContaining({
              email: true,
              sms: false,
              tripReminders: true,
              swapRequests: true,
              scheduleChanges: true,
            }),
          }),
        })
      );
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';

    it('should return user when found', async () => {
      // Arrange
      const expectedUser = createMockUser({ id: userId });
      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockUserRepository.findById.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow('Error fetching user');
    });
  });

  describe('getUserByEmail', () => {
    const email = 'test@teslaSTEM.org';

    it('should return user with password hash when found', async () => {
      // Arrange
      const userWithPassword = {
        ...createMockUser({ email }),
        passwordHash: 'hashedPassword123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(userWithPassword);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(userWithPassword);
      expect(result?.passwordHash).toBe('hashedPassword123');
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.getUserByEmail(email)).rejects.toThrow('Error fetching user by email');
    });
  });

  describe('findByEmail', () => {
    const email = 'test@teslaSTEM.org';

    it('should return user without password hash when found', async () => {
      // Arrange
      const userWithPassword = {
        ...createMockUser({ email }),
        passwordHash: 'hashedPassword123',
      };
      mockUserRepository.findByEmail.mockResolvedValue(userWithPassword);

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toBeDefined();
      expect((result as any).passwordHash).toBeUndefined();
      expect(result?.email).toBe(email);
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const userId = 'user-123';

    it('should update user successfully', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1987654321',
      };
      const updatedUser = { ...existingUser, ...updates, updatedAt: new Date() };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(userId, updates);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, expect.objectContaining(updates));
      expect(result).toEqual(updatedUser);
    });

    it('should update user preferences successfully', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      const preferenceUpdates = {
        pickupLocation: '789 New St',
        isDriver: true,
        maxPassengers: 4,
      };
      const updates = { preferences: preferenceUpdates };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        preferences: { ...existingUser.preferences, ...preferenceUpdates },
        updatedAt: new Date(),
      });

      // Act
      const result = await userService.updateUser(userId, updates);

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          preferences: expect.objectContaining(preferenceUpdates),
        })
      );
      expect(result?.preferences.pickupLocation).toBe('789 New St');
      expect(result?.preferences.isDriver).toBe(true);
      expect(result?.preferences.maxPassengers).toBe(4);
    });

    it('should merge notification preferences correctly', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      const notificationUpdates = {
        notifications: {
          email: false,
          tripReminders: false,
          sms: false,
          swapRequests: true,
          scheduleChanges: true,
        },
      };
      const updates = { preferences: notificationUpdates };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        preferences: {
          ...existingUser.preferences,
          notifications: {
            ...existingUser.preferences.notifications,
            ...notificationUpdates.notifications,
          },
        },
        updatedAt: new Date(),
      });

      // Act
      const result = await userService.updateUser(userId, updates);

      // Assert
      expect(result?.preferences.notifications.email).toBe(false);
      expect(result?.preferences.notifications.tripReminders).toBe(false);
      expect(result?.preferences.notifications.sms).toBe(false); // Should retain original value
      expect(result?.preferences.notifications.swapRequests).toBe(true); // Should retain original value
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.updateUser(userId, { firstName: 'Jane' });

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.updateUser(userId, { firstName: 'Jane' })).rejects.toThrow('Error updating user');
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-123';

    it('should delete user successfully', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      // Act
      const result = await userService.deleteUser(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.deleteUser(userId);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const existingUser = createMockUser({ id: userId });
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.deleteUser(userId)).rejects.toThrow('Error deleting user');
    });
  });

  describe('getUsers', () => {
    it('should return paginated users without password hashes', async () => {
      // Arrange
      const usersWithPasswords = [
        { ...createMockUser({ id: '1' }), passwordHash: 'hash1' },
        { ...createMockUser({ id: '2' }), passwordHash: 'hash2' },
        { ...createMockUser({ id: '3' }), passwordHash: 'hash3' },
      ];
      mockUserRepository.query.mockResolvedValue(usersWithPasswords);

      // Act
      const result = await userService.getUsers({ limit: 2, offset: 0 });

      // Assert
      expect(result.total).toBe(3);
      expect(result.users).toHaveLength(2);
      expect((result.users[0] as any).passwordHash).toBeUndefined();
      expect((result.users[1] as any).passwordHash).toBeUndefined();
    });

    it('should handle search term filtering', async () => {
      // Arrange
      const usersWithPasswords = [
        { ...createMockUser({ id: '1', firstName: 'John' }), passwordHash: 'hash1' },
        { ...createMockUser({ id: '2', firstName: 'Jane' }), passwordHash: 'hash2' },
      ];
      mockUserRepository.query.mockResolvedValue(usersWithPasswords);

      // Act
      const result = await userService.getUsers({ searchTerm: 'john' });

      // Assert
      expect(mockUserRepository.query).toHaveBeenCalledWith({
        query: expect.stringContaining('CONTAINS'),
        parameters: expect.arrayContaining([
          expect.objectContaining({ name: '@searchTerm', value: 'john' })
        ])
      });
      expect(result.users).toHaveLength(2);
    });

    it('should return all users when no pagination options provided', async () => {
      // Arrange
      const usersWithPasswords = [
        { ...createMockUser({ id: '1' }), passwordHash: 'hash1' },
        { ...createMockUser({ id: '2' }), passwordHash: 'hash2' },
      ];
      mockUserRepository.query.mockResolvedValue(usersWithPasswords);

      // Act
      const result = await userService.getUsers();

      // Assert
      expect(result.total).toBe(2);
      expect(result.users).toHaveLength(2);
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockUserRepository.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(userService.getUsers()).rejects.toThrow('Error fetching users');
    });
  });

  describe('Static methods', () => {
    it('should provide static getUserByEmail method', async () => {
      // This test verifies the static method exists but doesn't test implementation
      // since it would require mocking the database import
      expect(typeof UserService.getUserByEmail).toBe('function');
    });

    it('should provide static createUser method', async () => {
      // This test verifies the static method exists but doesn't test implementation
      // since it would require mocking the database import
      expect(typeof UserService.createUser).toBe('function');
    });
  });
});
