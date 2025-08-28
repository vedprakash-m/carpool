/**
 * Configuration Service for Carpool Application
 * Manages environment variables and service configurations securely
 */

export interface AppConfig {
  // Database Configuration
  cosmosDb: {
    endpoint: string;
    key: string;
    databaseName: string;
    containerName: string;
  };

  // Authentication Configuration
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number; // in minutes
  };

  // Geocoding API Configuration
  geocoding: {
    googleMapsApiKey?: string;
    azureMapsKey?: string;
    preferredProvider: 'google' | 'azure' | 'mock';
    fallbackToMock: boolean;
  };

  // Application Settings
  app: {
    environment: 'development' | 'staging' | 'production';
    corsOrigins: string[];
    maxDistanceKm: number;
    defaultServiceRadius: number;
  };
}

class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // For testing purposes only - reset the singleton instance
  public static resetInstance(): void {
    ConfigService.instance = null as any;
  }

  private loadConfiguration(): AppConfig {
    return {
      cosmosDb: {
        endpoint: process.env.COSMOS_DB_ENDPOINT || '',
        key: process.env.COSMOS_DB_KEY || '',
        databaseName: process.env.COSMOS_DB_DATABASE || 'carpooldb',
        containerName: process.env.COSMOS_DB_CONTAINER || 'users',
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET || 'carpool-dev-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15'),
      },
      geocoding: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        azureMapsKey: process.env.AZURE_MAPS_KEY,
        preferredProvider:
          (process.env.GEOCODING_PROVIDER as 'google' | 'azure' | 'mock') || 'mock',
        fallbackToMock: process.env.FALLBACK_TO_MOCK === 'true',
      },
      app: {
        environment:
          (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        maxDistanceKm: parseInt(process.env.MAX_DISTANCE_KM || '50'),
        defaultServiceRadius: parseInt(process.env.DEFAULT_SERVICE_RADIUS || '25'),
      },
    };
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate production environment requirements
    if (this.config.app.environment === 'production') {
      if (!this.config.cosmosDb.endpoint || !this.config.cosmosDb.key) {
        errors.push('Cosmos DB configuration is required in production');
      }

      // Validate JWT secrets - check for both legacy and new format
      const hasProductionJwtSecret =
        this.config.auth.jwtSecret !== 'carpool-dev-secret-key' &&
        this.config.auth.jwtSecret !== 'carpool-access-secret-change-in-production' &&
        this.config.auth.jwtSecret.length >= 32;

      if (!hasProductionJwtSecret) {
        errors.push('Custom JWT secret (minimum 32 characters) is required in production');
      }

      // Validate Azure Entra ID configuration for production
      if (!process.env.AZURE_TENANT_ID || process.env.AZURE_TENANT_ID === 'VED') {
        errors.push('AZURE_TENANT_ID must be configured for production Entra ID integration');
      }

      if (!process.env.AZURE_CLIENT_ID) {
        errors.push('AZURE_CLIENT_ID must be configured for production Entra ID integration');
      }

      // Warn about missing optional services
      if (!this.config.geocoding.googleMapsApiKey && !this.config.geocoding.azureMapsKey) {
        console.warn('Warning: No real geocoding API keys configured in production');
      }

      if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
        console.warn('Warning: Application Insights not configured for production monitoring');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config }; // Return a copy to prevent mutations
  }

  public isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  public isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  public hasRealGeocoding(): boolean {
    return !!(this.config.geocoding.googleMapsApiKey || this.config.geocoding.azureMapsKey);
  }

  public shouldUseRealDatabase(): boolean {
    return !!(this.config.cosmosDb.endpoint && this.config.cosmosDb.key);
  }
}

export const configService = ConfigService.getInstance();
export default configService;
