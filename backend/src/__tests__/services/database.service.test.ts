import { DatabaseService, databaseService, User } from '../../services/database.service';
import { configService } from '../../services/config.service';
import { UserEntity } from '@carpool/shared';

// Test fixture factory
function createTestUserData(
  overrides: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'parent',
    authProvider: 'legacy',
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
    ...overrides,
  };
}

// Mock the Azure Cosmos SDK
jest.mock('@azure/cosmos', () => ({
  CosmosClient: jest.fn().mockImplementation(() => ({
    databases: {
      createIfNotExists: jest.fn().mockImplementation(() => ({
        database: {
          containers: {
            createIfNotExists: jest.fn().mockImplementation(() => ({
              container: {
                items: {
                  create: jest.fn(),
                  query: jest.fn().mockReturnValue({
                    fetchAll: jest.fn(),
                  }),
                },
                item: jest.fn().mockReturnValue({
                  replace: jest.fn(),
                  delete: jest.fn(),
                }),
              },
            })),
          },
        },
      })),
    },
  })),
}));

// Mock configService
jest.mock('../../services/config.service', () => ({
  configService: {
    shouldUseRealDatabase: jest.fn(),
    getConfig: jest.fn().mockReturnValue({
      cosmosDb: {
        endpoint: 'https://test.documents.azure.com:443/',
        key: 'test-key',
        databaseName: 'test-db',
        containerName: 'test-container',
      },
      auth: {
        bcryptRounds: 12,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
      },
    }),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockConfigService: jest.Mocked<typeof configService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = configService as jest.Mocked<typeof configService>;

    // Reset singleton instance
    (DatabaseService as any).instance = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);

      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    it('should initialize in-memory storage when real database is not available', () => {
      expect(mockConfigService.shouldUseRealDatabase).toHaveBeenCalled();
    });

    it('should create test users in memory', async () => {
      // Wait a bit for async initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user = await databaseService.getUserByEmail('admin@carpool.com');
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe('Admin');
      expect(user?.role).toBe('super_admin');
    });
  });

  describe('Initialization - Cosmos DB Mode', () => {
    it('should initialize Cosmos DB when real database is available', () => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      const instance = DatabaseService.getInstance();

      expect(instance).toBeDefined();
      expect(mockConfigService.shouldUseRealDatabase).toHaveBeenCalled();
    });

    it('should fall back to in-memory when Cosmos DB initialization fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      // Mock Cosmos client to throw error
      const mockCosmosClient = require('@azure/cosmos').CosmosClient;
      mockCosmosClient.mockImplementation(() => {
        throw new Error('Cosmos DB connection failed');
      });

      const instance = DatabaseService.getInstance();

      expect(instance).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize Cosmos DB:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Falling back to in-memory storage');

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('User Management - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    describe('createUser', () => {
      it('should create a user in memory', async () => {
        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        const user = await databaseService.createUser(userData);

        expect(user).toMatchObject(userData);
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
      });
    });

    describe('getUserByEmail', () => {
      it('should return user when found', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const user = await databaseService.getUserByEmail('admin@carpool.com');

        expect(user).toBeTruthy();
        expect(user?.email).toBe('admin@carpool.com');
      });

      it('should return null when user not found', async () => {
        const user = await databaseService.getUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update existing user', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updates = { firstName: 'Updated' };
        const updatedUser = await databaseService.updateUser('admin@carpool.com', updates);

        expect(updatedUser).toBeTruthy();
        expect(updatedUser?.firstName).toBe('Updated');
        expect(updatedUser?.updatedAt).toBeDefined();
      });

      it('should return null when user does not exist', async () => {
        const updates = { firstName: 'Updated' };
        const result = await databaseService.updateUser('nonexistent@example.com', updates);

        expect(result).toBeNull();
      });
    });

    describe('deleteUser', () => {
      it('should delete existing user', async () => {
        // Wait for test users to be initialized
        await new Promise((resolve) => setTimeout(resolve, 10));

        const result = await databaseService.deleteUser('admin@carpool.com');

        expect(result).toBe(true);

        // Verify user is deleted
        const user = await databaseService.getUserByEmail('admin@carpool.com');
        expect(user).toBeNull();
      });

      it('should return false when user does not exist', async () => {
        const result = await databaseService.deleteUser('nonexistent@example.com');

        expect(result).toBe(false);
      });
    });
  });

  describe('User Management - Cosmos DB Mode', () => {
    let mockContainer: any;
    let mockCosmosClient: any;

    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(true);

      // Setup mock container
      mockContainer = {
        items: {
          create: jest.fn(),
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn(),
          }),
        },
        item: jest.fn().mockReturnValue({
          replace: jest.fn(),
          delete: jest.fn(),
        }),
      };

      // Setup mock Cosmos client
      mockCosmosClient = require('@azure/cosmos').CosmosClient;
      mockCosmosClient.mockImplementation(() => ({
        databases: {
          createIfNotExists: jest.fn().mockResolvedValue({
            database: {
              containers: {
                createIfNotExists: jest.fn().mockResolvedValue({
                  container: mockContainer,
                }),
              },
            },
          }),
        },
      }));

      databaseService = DatabaseService.getInstance();
    });

    describe('createUser', () => {
      it('should create user in Cosmos DB', async () => {
        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        const mockCreatedUser = { ...userData, id: 'generated-id' };
        mockContainer.items.create.mockResolvedValue({ resource: mockCreatedUser });

        const user = await databaseService.createUser(userData);

        expect(mockContainer.items.create).toHaveBeenCalledWith(expect.objectContaining(userData));
        expect(user).toEqual(mockCreatedUser);
      });

      it('should handle Cosmos DB creation errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const userData = createTestUserData({
          passwordHash: 'hashed-password',
        });

        mockContainer.items.create.mockRejectedValue(new Error('Cosmos DB error'));

        await expect(databaseService.createUser(userData)).rejects.toThrow('Failed to create user');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error creating user in Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('getUserByEmail', () => {
      it('should fetch user from Cosmos DB', async () => {
        const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [mockUser] });

        const user = await databaseService.getUserByEmail('test@example.com');

        expect(user).toEqual(mockUser);
      });

      it('should return null when user not found in Cosmos DB', async () => {
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [] });

        const user = await databaseService.getUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });

      it('should handle Cosmos DB query errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockContainer.items.query().fetchAll.mockRejectedValue(new Error('Query failed'));

        const user = await databaseService.getUserByEmail('test@example.com');

        expect(user).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching user from Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('updateUser', () => {
      it('should update user in Cosmos DB', async () => {
        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        const updates = { firstName: 'Updated' };
        const updatedUser = { ...existingUser, ...updates };

        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().replace.mockResolvedValue({ resource: updatedUser });

        const result = await databaseService.updateUser('test@example.com', updates);

        expect(result).toEqual(updatedUser);
        expect(mockContainer.item).toHaveBeenCalledWith('1', 'test@example.com');
      });

      it('should handle Cosmos DB update errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().replace.mockRejectedValue(new Error('Update failed'));

        const result = await databaseService.updateUser('test@example.com', {
          firstName: 'Updated',
        });

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error updating user in Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });

    describe('deleteUser', () => {
      it('should delete user from Cosmos DB', async () => {
        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };

        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().delete.mockResolvedValue({});

        const result = await databaseService.deleteUser('test@example.com');

        expect(result).toBe(true);
        expect(mockContainer.item).toHaveBeenCalledWith('1', 'test@example.com');
      });

      it('should handle Cosmos DB delete errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const existingUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
        mockContainer.items.query().fetchAll.mockResolvedValue({ resources: [existingUser] });
        mockContainer.item().delete.mockRejectedValue(new Error('Delete failed'));

        const result = await databaseService.deleteUser('test@example.com');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error deleting user from Cosmos DB:',
          expect.any(Error),
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('Login Attempt Management', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      databaseService = DatabaseService.getInstance();
    });

    describe('recordLoginAttempt', () => {
      it('should record first login attempt', async () => {
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should increment existing attempts', async () => {
        // Record multiple attempts
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should lock account after max attempts', async () => {
        // Record max attempts (5 by default)
        for (let i = 0; i < 5; i++) {
          await databaseService.recordLoginAttempt('test@example.com');
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(true);
      });
    });

    describe('clearLoginAttempts', () => {
      it('should clear login attempts for user', async () => {
        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.clearLoginAttempts('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });
    });

    describe('isAccountLocked', () => {
      it('should return false when no attempts recorded', async () => {
        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should return false when account is not locked', async () => {
        await databaseService.recordLoginAttempt('test@example.com');

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });

      it('should return true when account is locked', async () => {
        // Lock the account
        for (let i = 0; i < 5; i++) {
          await databaseService.recordLoginAttempt('test@example.com');
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(true);
      });

      it('should clear expired locks', async () => {
        // Manually set an expired lock
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 20); // 20 minutes ago

        await databaseService.recordLoginAttempt('test@example.com');
        // Access internal state to set expired lock
        const loginAttempts = (databaseService as any).loginAttempts;
        const attempt = loginAttempts.get('test@example.com');
        if (attempt) {
          attempt.lockedUntil = pastDate;
          attempt.attempts = 5;
        }

        const isLocked = await databaseService.isAccountLocked('test@example.com');
        expect(isLocked).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      (DatabaseService as any).instance = undefined;
      jest.clearAllMocks();
    });

    describe('getLoginAttempts', () => {
      it('should return login attempts count', async () => {
        databaseService = DatabaseService.getInstance();

        await databaseService.recordLoginAttempt('test@example.com');
        await databaseService.recordLoginAttempt('test@example.com');

        const attempts = await databaseService.getLoginAttempts('test@example.com');
        expect(attempts).toBe(2);
      });

      it('should return 0 for user with no attempts', async () => {
        databaseService = DatabaseService.getInstance();

        const attempts = await databaseService.getLoginAttempts('noattempts@example.com');
        expect(attempts).toBe(0);
      });
    });

    describe('isUsingRealDatabase', () => {
      it('should return false when using in-memory storage', () => {
        databaseService = DatabaseService.getInstance();
        expect(databaseService.isUsingRealDatabase()).toBe(false);
      });
    });

    describe('healthCheck', () => {
      it('should return health status for in-memory mode', async () => {
        databaseService = DatabaseService.getInstance();

        const health = await databaseService.healthCheck();

        expect(health).toEqual({
          status: 'healthy',
          database: 'in-memory',
          userCount: expect.any(Number),
        });
      });
    });

    describe('getDefaultContainer', () => {
      it('should return undefined when using in-memory storage', () => {
        databaseService = DatabaseService.getInstance();
        expect(databaseService.getDefaultContainer()).toBeUndefined();
      });
    });

    describe('getAvailableContainers', () => {
      it('should return list of container names', () => {
        databaseService = DatabaseService.getInstance();
        const containers = databaseService.getAvailableContainers();

        expect(containers).toContain('users');
        expect(containers).toContain('trips');
        expect(containers).toContain('groups');
        expect(containers).toContain('schedules');
        expect(containers).toContain('swapRequests');
      });
    });

    describe('getContainer', () => {
      it('should return undefined when using in-memory storage', () => {
        databaseService = DatabaseService.getInstance();
        expect(databaseService.getContainer('users')).toBeUndefined();
      });
    });
  });

  describe('Group Management - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      (DatabaseService as any).instance = undefined;
      databaseService = DatabaseService.getInstance();
    });

    describe('createGroup', () => {
      it('should create a group in memory', async () => {
        // Use any since we're testing in-memory storage which is more permissive
        const groupData = {
          id: 'group-1',
          name: 'Morning Carpool',
          schoolId: 'school-1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        const group = await databaseService.createGroup(groupData);

        expect(group).toEqual(groupData);
      });
    });

    describe('getGroupById', () => {
      it('should return group when found', async () => {
        const groupData = {
          id: 'group-2',
          name: 'Test Carpool',
          schoolId: 'school-1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        await databaseService.createGroup(groupData);

        const group = await databaseService.getGroupById('group-2');
        expect(group).toEqual(groupData);
      });

      it('should return null when group not found', async () => {
        const group = await databaseService.getGroupById('nonexistent-group');
        expect(group).toBeNull();
      });
    });

    describe('getGroupsBySchool', () => {
      it('should return groups for specific school', async () => {
        const group1 = {
          id: 'group-3',
          name: 'School A Carpool',
          schoolId: 'school-a',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        const group2 = {
          id: 'group-4',
          name: 'School B Carpool',
          schoolId: 'school-b',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        await databaseService.createGroup(group1);
        await databaseService.createGroup(group2);

        const groups = await databaseService.getGroupsBySchool('school-a');
        expect(groups.length).toBe(1);
        expect(groups[0].id).toBe('group-3');
      });

      it('should return all groups when no school specified', async () => {
        const groups = await databaseService.getGroupsBySchool();
        expect(Array.isArray(groups)).toBe(true);
      });
    });

    describe('updateGroup', () => {
      it('should update existing group', async () => {
        const groupData = {
          id: 'group-5',
          name: 'Original Name',
          schoolId: 'school-1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;

        await databaseService.createGroup(groupData);

        const updated = await databaseService.updateGroup('group-5', { name: 'Updated Name' });
        expect(updated?.name).toBe('Updated Name');
      });

      it('should return null when group not found', async () => {
        const result = await databaseService.updateGroup('nonexistent', { name: 'Test' });
        expect(result).toBeNull();
      });
    });

    describe('createJoinRequest', () => {
      it('should create a join request in memory', async () => {
        const joinRequest = {
          id: 'request-1',
          groupId: 'group-1',
          userId: 'user-1',
          status: 'pending',
          createdAt: new Date(),
        };

        const result = await databaseService.createJoinRequest(joinRequest);
        expect(result).toEqual(joinRequest);
      });
    });

    describe('getJoinRequestById', () => {
      it('should return join request when found', async () => {
        const joinRequest = {
          id: 'request-2',
          groupId: 'group-1',
          userId: 'user-1',
          status: 'pending',
          createdAt: new Date(),
        };

        await databaseService.createJoinRequest(joinRequest);

        const result = await databaseService.getJoinRequestById('request-2');
        expect(result).toEqual(joinRequest);
      });

      it('should return null when join request not found', async () => {
        const result = await databaseService.getJoinRequestById('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('updateJoinRequestStatus', () => {
      it('should update join request status', async () => {
        const joinRequest = {
          id: 'request-3',
          groupId: 'group-1',
          userId: 'user-1',
          status: 'pending',
          createdAt: new Date(),
        };

        await databaseService.createJoinRequest(joinRequest);
        await databaseService.updateJoinRequestStatus('request-3', 'approved');

        const updated = await databaseService.getJoinRequestById('request-3');
        expect(updated?.status).toBe('approved');
      });

      it('should handle non-existent join request gracefully', async () => {
        // Should not throw error
        await expect(
          databaseService.updateJoinRequestStatus('nonexistent', 'approved'),
        ).resolves.toBeUndefined();
      });
    });

    describe('getSchools', () => {
      it('should return list of schools', async () => {
        const schools = await databaseService.getSchools();

        expect(Array.isArray(schools)).toBe(true);
        expect(schools.length).toBeGreaterThan(0);
        expect(schools[0]).toHaveProperty('id');
        expect(schools[0]).toHaveProperty('name');
      });
    });
  });

  describe('getUserById - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      (DatabaseService as any).instance = undefined;
      databaseService = DatabaseService.getInstance();
    });

    it('should return user by ID when found', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user = await databaseService.getUserByEmail('admin@carpool.com');
      expect(user).toBeTruthy();

      if (user) {
        const foundUser = await databaseService.getUserById(user.id);
        expect(foundUser).toBeTruthy();
        expect(foundUser?.email).toBe('admin@carpool.com');
      }
    });

    it('should return null when user ID not found', async () => {
      const user = await databaseService.getUserById('nonexistent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEntraId - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      (DatabaseService as any).instance = undefined;
      databaseService = DatabaseService.getInstance();
    });

    it('should return user by Entra ID when found', async () => {
      const userData = createTestUserData({
        email: 'entra-user@test.com',
        entraObjectId: 'entra-obj-123',
      } as any);

      await databaseService.createUser(userData);

      const user = await databaseService.getUserByEntraId('entra-obj-123');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('entra-user@test.com');
    });

    it('should return null when Entra ID not found', async () => {
      const user = await databaseService.getUserByEntraId('nonexistent-entra-id');
      expect(user).toBeNull();
    });
  });

  describe('updateUserById - In-Memory Mode', () => {
    beforeEach(() => {
      mockConfigService.shouldUseRealDatabase.mockReturnValue(false);
      (DatabaseService as any).instance = undefined;
      databaseService = DatabaseService.getInstance();
    });

    it('should update user by ID', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user = await databaseService.getUserByEmail('admin@carpool.com');
      expect(user).toBeTruthy();

      if (user) {
        const updated = await databaseService.updateUserById(user.id, { firstName: 'UpdatedName' });
        expect(updated?.firstName).toBe('UpdatedName');
      }
    });

    it('should return null when user ID not found', async () => {
      const result = await databaseService.updateUserById('nonexistent-id', { firstName: 'Test' });
      expect(result).toBeNull();
    });
  });
});
