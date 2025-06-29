/**
 * Database Service for VCarpool Application
 * Provides unified interface for Cosmos DB and in-memory storage
 */

import { CosmosClient, Container, Database } from '@azure/cosmos';
import { configService } from './config.service';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'parent' | 'student' | 'admin';
  phoneNumber?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  loginAttempts?: number;
  lockedUntil?: string;
}

export interface LoginAttempt {
  email: string;
  attempts: number;
  lockedUntil?: Date;
  lastAttempt: Date;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private cosmosClient?: CosmosClient;
  private database?: Database;
  private container?: Container;
  private inMemoryUsers: Map<string, User> = new Map();
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private useRealDatabase: boolean;

  private constructor() {
    this.useRealDatabase = configService.shouldUseRealDatabase();
    if (this.useRealDatabase) {
      this.initializeCosmosDB();
    } else {
      this.initializeInMemoryStorage();
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initializeCosmosDB(): Promise<void> {
    try {
      const config = configService.getConfig();
      this.cosmosClient = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
      });

      // Ensure database and container exist
      const { database } = await this.cosmosClient.databases.createIfNotExists({
        id: config.cosmosDb.databaseName,
      });
      this.database = database;

      const { container } = await this.database.containers.createIfNotExists({
        id: config.cosmosDb.containerName,
        partitionKey: '/email',
      });
      this.container = container;

      console.log('Cosmos DB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cosmos DB:', error);
      console.log('Falling back to in-memory storage');
      this.useRealDatabase = false;
      this.initializeInMemoryStorage();
    }
  }

  private initializeInMemoryStorage(): void {
    // Initialize with some test users for development
    const testUsers: User[] = [
      {
        id: '1',
        email: 'admin@vcarpool.com',
        passwordHash: '', // Will be set below
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phoneNumber: '+1234567890',
        address: '123 Main St, Anytown, USA',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'parent@vcarpool.com',
        passwordHash: '', // Will be set below
        firstName: 'John',
        lastName: 'Parent',
        role: 'parent',
        phoneNumber: '+1234567891',
        address: '456 Oak Ave, Anytown, USA',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Hash passwords for test users
    const initializeTestUsers = async () => {
      const config = configService.getConfig();
      for (const user of testUsers) {
        user.passwordHash = await bcrypt.hash('password123', config.auth.bcryptRounds);
        this.inMemoryUsers.set(user.email, user);
      }
    };

    initializeTestUsers().catch(console.error);
    console.log('In-memory storage initialized with test users');
  }

  // User Management Methods
  public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.items.create(user);
        return resource as User;
      } catch (error) {
        console.error('Error creating user in Cosmos DB:', error);
        throw new Error('Failed to create user');
      }
    } else {
      this.inMemoryUsers.set(user.email, user);
      return user;
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.email = @email',
            parameters: [{ name: '@email', value: email }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as User) : null;
      } catch (error) {
        console.error('Error fetching user from Cosmos DB:', error);
        return null;
      }
    } else {
      return this.inMemoryUsers.get(email) || null;
    }
  }

  public async getUserByEntraId(entraId: string): Promise<User | null> {
    if (this.useRealDatabase && this.container) {
      try {
        const { resources } = await this.container.items
          .query({
            query: 'SELECT * FROM c WHERE c.entraObjectId = @entraId',
            parameters: [{ name: '@entraId', value: entraId }],
          })
          .fetchAll();

        return resources.length > 0 ? (resources[0] as User) : null;
      } catch (error) {
        console.error('Error fetching user by Entra ID from Cosmos DB:', error);
        return null;
      }
    } else {
      // Search through in-memory users for Entra ID
      for (const user of this.inMemoryUsers.values()) {
        if ((user as any).entraObjectId === entraId) {
          return user;
        }
      }
      return null;
    }
  }

  public async updateUser(email: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.useRealDatabase && this.container) {
      try {
        const { resource } = await this.container.item(user.id, email).replace(updatedUser);
        return resource as User;
      } catch (error) {
        console.error('Error updating user in Cosmos DB:', error);
        return null;
      }
    } else {
      this.inMemoryUsers.set(email, updatedUser);
      return updatedUser;
    }
  }

  public async deleteUser(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;

    if (this.useRealDatabase && this.container) {
      try {
        await this.container.item(user.id, email).delete();
        return true;
      } catch (error) {
        console.error('Error deleting user from Cosmos DB:', error);
        return false;
      }
    } else {
      return this.inMemoryUsers.delete(email);
    }
  }

  // Login Attempt Management
  public async recordLoginAttempt(email: string): Promise<void> {
    const config = configService.getConfig();
    const existing = this.loginAttempts.get(email);

    if (existing) {
      existing.attempts += 1;
      existing.lastAttempt = new Date();

      if (existing.attempts >= config.auth.maxLoginAttempts) {
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(lockoutEnd.getMinutes() + config.auth.lockoutDuration);
        existing.lockedUntil = lockoutEnd;
      }
    } else {
      this.loginAttempts.set(email, {
        email,
        attempts: 1,
        lastAttempt: new Date(),
      });
    }
  }

  public async clearLoginAttempts(email: string): Promise<void> {
    this.loginAttempts.delete(email);
  }

  public async isAccountLocked(email: string): Promise<boolean> {
    const attempt = this.loginAttempts.get(email);
    if (!attempt || !attempt.lockedUntil) return false;

    if (new Date() > attempt.lockedUntil) {
      // Lock has expired, clear attempts
      this.loginAttempts.delete(email);
      return false;
    }

    return true;
  }

  public async getLoginAttempts(email: string): Promise<number> {
    const attempt = this.loginAttempts.get(email);
    return attempt ? attempt.attempts : 0;
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  public isUsingRealDatabase(): boolean {
    return this.useRealDatabase;
  }

  public async healthCheck(): Promise<{
    status: string;
    database: string;
    userCount?: number;
  }> {
    try {
      if (this.useRealDatabase && this.container) {
        const { resources } = await this.container.items
          .query('SELECT VALUE COUNT(1) FROM c')
          .fetchAll();
        return {
          status: 'healthy',
          database: 'cosmos-db',
          userCount: resources[0],
        };
      } else {
        return {
          status: 'healthy',
          database: 'in-memory',
          userCount: this.inMemoryUsers.size,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        database: this.useRealDatabase ? 'cosmos-db' : 'in-memory',
      };
    }
  }

  // ADD BELOW: public accessor for the default Cosmos container so repositories can resolve it safely
  public getDefaultContainer(): Container | undefined {
    return this.container;
  }
}

export const databaseService = DatabaseService.getInstance();
export default databaseService;
