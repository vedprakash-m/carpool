/**
 * Unified Database Connection Service
 *
 * Replaces the fragmented database configuration in config/database.ts
 * Provides a single point of access to database connections.
 *
 * Migration Guide:
 * - Replace imports from config/database.ts with this service
 * - Use DatabaseConnectionService.getInstance() instead of direct imports
 * - All containers are now managed through the DatabaseService
 */

import { CosmosClient, Database, Container } from '@azure/cosmos';
import { databaseService } from './database.service';

export class DatabaseConnectionService {
  private static instance: DatabaseConnectionService;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): DatabaseConnectionService {
    if (!DatabaseConnectionService.instance) {
      DatabaseConnectionService.instance = new DatabaseConnectionService();
    }
    return DatabaseConnectionService.instance;
  }

  /**
   * Get the primary Cosmos client
   * @deprecated Use databaseService directly for new code
   */
  public getCosmosClient(): CosmosClient | undefined {
    console.warn(
      'DatabaseConnectionService.getCosmosClient() is deprecated. Use databaseService directly.',
    );
    return (databaseService as any).cosmosClient;
  }

  /**
   * Get the primary database
   * @deprecated Use databaseService.getContainer() instead
   */
  public getDatabase(): Database | undefined {
    console.warn(
      'DatabaseConnectionService.getDatabase() is deprecated. Use databaseService.getContainer() instead.',
    );
    return (databaseService as any).database;
  }

  /**
   * Get container by name - recommended approach
   */
  public getContainer(containerName: string): Container | undefined {
    return databaseService.getContainer(containerName);
  }

  /**
   * Get the default container (users)
   */
  public getDefaultContainer(): Container | undefined {
    return databaseService.getDefaultContainer();
  }

  /**
   * Check if real database is available
   */
  public isUsingRealDatabase(): boolean {
    return databaseService.isUsingRealDatabase();
  }

  /**
   * Initialize database - handled automatically by DatabaseService
   */
  public async initialize(): Promise<void> {
    // Database initialization is handled by DatabaseService constructor
    console.log('Database initialization is handled automatically by DatabaseService');
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<any> {
    return databaseService.healthCheck();
  }
}

// Export singleton instance for easy access
export const dbConnection = DatabaseConnectionService.getInstance();

// Legacy exports for backward compatibility
export const cosmosClient = dbConnection.getCosmosClient();
export const database = dbConnection.getDatabase();

// Container helpers
export const containers = {
  users: () => dbConnection.getContainer('users'),
  trips: () => dbConnection.getContainer('trips'),
  schedules: () => dbConnection.getContainer('schedules'),
  swapRequests: () => dbConnection.getContainer('swapRequests'),
  groups: () => dbConnection.getContainer('groups'),
  notifications: () => dbConnection.getContainer('notifications'),
  messages: () => dbConnection.getContainer('messages'),
  weeklyPreferences: () => dbConnection.getContainer('weeklyPreferences'),
};

export default dbConnection;
