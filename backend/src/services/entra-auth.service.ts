import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { InvocationContext } from '@azure/functions';
import { VedUser } from '../../../shared/src/types';
import { DatabaseService, User } from './database.service';

interface EntraIDClaims {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  oid: string;
  tid: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
}

interface JWKSCache {
  [key: string]: {
    key: string;
    timestamp: number;
  };
}

// Legacy interface for backward compatibility during migration
export interface CarpoolUser extends User {
  entraObjectId?: string;
  authProvider: 'legacy' | 'entra';
  migrationDate?: Date;
  phoneVerified?: boolean;
  addressVerified?: boolean;
  emergencyContact?: string;
  schoolId?: string;
}

export class EntraAuthService {
  private client: jwksClient.JwksClient;
  private keyCache: JWKSCache = {};
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private databaseService: DatabaseService;

  constructor() {
    this.client = jwksClient({
      jwksUri: 'https://login.microsoftonline.com/vedid.onmicrosoft.com/discovery/v2.0/keys',
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: this.cacheTimeout,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
    this.databaseService = DatabaseService.getInstance();
  }

  private async getSigningKey(kid: string): Promise<string> {
    // Check cache first
    const cached = this.keyCache[kid];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.key;
    }

    try {
      const key = await this.client.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      // Cache the key
      this.keyCache[kid] = {
        key: signingKey,
        timestamp: Date.now(),
      };

      return signingKey;
    } catch (error: any) {
      throw new Error(`Unable to get signing key: ${error?.message || 'Unknown error'}`);
    }
  }

  async validateToken(token: string): Promise<VedUser> {
    try {
      // Decode token header to get kid
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        throw new Error('Invalid token format');
      }

      const { kid } = decodedHeader.header;
      if (!kid) {
        throw new Error('Token missing kid in header');
      }

      // Get signing key
      const signingKey = await this.getSigningKey(kid);

      // Verify token
      const decoded = jwt.verify(token, signingKey, {
        audience: process.env.ENTRA_CLIENT_ID,
        issuer: 'https://login.microsoftonline.com/vedid.onmicrosoft.com/v2.0',
        algorithms: ['RS256'],
      }) as EntraIDClaims;

      // Extract user information and convert to VedUser format
      const vedUser: VedUser = {
        id: decoded.sub, // Use subject claim as primary identifier
        email: decoded.email,
        name: decoded.name,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        permissions: [], // Will be populated from app-specific data
        vedProfile: undefined, // Will be loaded from database if exists
      };

      return vedUser;
    } catch (error: any) {
      if (error?.name === 'JsonWebTokenError') {
        throw new Error('Invalid token signature');
      } else if (error?.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error?.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      } else {
        throw new Error(`Token validation failed: ${error?.message || 'Unknown error'}`);
      }
    }
  }
  async enrichUserWithProfile(vedUser: VedUser, context: InvocationContext): Promise<VedUser> {
    try {
      // Load user profile from Cosmos DB based on vedUser.id
      const existingUser = await this.databaseService.getUserByEntraId(vedUser.id);

      if (existingUser) {
        // User exists, enrich with profile data
        return {
          ...vedUser,
          permissions: this.getUserPermissions(existingUser.role),
          vedProfile: {
            phoneNumber: existingUser.phoneNumber,
            homeAddress: existingUser.address,
            emergencyContact: (existingUser as any).emergencyContact,
            role: existingUser.role as any,
            preferences: {
              pickupLocation: '',
              dropoffLocation: '',
              preferredTime: '',
              isDriver: false,
              smokingAllowed: false,
              notifications: {
                email: true,
                sms: true,
                tripReminders: true,
                swapRequests: true,
                scheduleChanges: true,
              },
            },
            isActiveDriver: (existingUser as any).isActiveDriver,
            travelSchedule: (existingUser as any).travelSchedule,
          },
        };
      } else {
        // New user, create basic profile
        context.log(`Creating new user profile for Entra ID: ${vedUser.id}`);
        return {
          ...vedUser,
          permissions: ['basic_access'],
          vedProfile: {
            role: 'parent', // Default role
            preferences: {
              pickupLocation: '',
              dropoffLocation: '',
              preferredTime: '',
              isDriver: false,
              smokingAllowed: false,
              notifications: {
                email: true,
                sms: true,
                tripReminders: true,
                swapRequests: true,
                scheduleChanges: true,
              },
            },
          },
        };
      }
    } catch (error) {
      context.log(`Failed to enrich user profile: ${error}`);
      // Return basic user if profile enrichment fails
      return {
        ...vedUser,
        permissions: ['basic_access'],
      };
    }
  }

  private getUserPermissions(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: ['platform_management', 'group_admin_promotion', 'system_configuration'],
      group_admin: [
        'group_management',
        'member_management',
        'trip_scheduling',
        'emergency_coordination',
      ],
      parent: ['trip_participation', 'preference_submission', 'child_management'],
      child: ['schedule_viewing', 'safety_reporting', 'profile_management'],
      student: ['schedule_viewing', 'safety_reporting', 'profile_management'],
      trip_admin: [
        'group_management',
        'member_management',
        'trip_scheduling',
        'emergency_coordination',
      ],
    };

    return permissionMap[role] || ['basic_access'];
  }
  /**
   * Legacy method for backward compatibility during migration
   */
  async validateLegacyUser(user: User): Promise<CarpoolUser> {
    return {
      ...user,
      authProvider: 'legacy',
    };
  }

  /**
   * Create hybrid user during migration process
   */
  async createHybridUser(entraUser: VedUser, legacyUser?: User): Promise<CarpoolUser> {
    if (legacyUser) {
      // Merge legacy user with Entra ID
      return {
        ...legacyUser,
        entraObjectId: entraUser.id,
        authProvider: 'entra',
        migrationDate: new Date(),
      };
    } else {
      // Create new user from Entra ID
      const newUser: CarpoolUser = {
        id: entraUser.id,
        email: entraUser.email,
        passwordHash: '', // No password for Entra users
        firstName: entraUser.firstName || '',
        lastName: entraUser.lastName || '',
        role: 'parent', // Convert UserRole to database role
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        entraObjectId: entraUser.id,
        authProvider: 'entra',
      };
      return newUser;
    }
  }
}

// Singleton instance
export const entraAuthService = new EntraAuthService();

// Middleware function for Azure Functions
export async function validateEntraToken(
  context: InvocationContext,
  authHeader?: string,
): Promise<VedUser> {
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header must start with "Bearer "');
  }

  const token = authHeader.substring(7);
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    const vedUser = await entraAuthService.validateToken(token);
    const enrichedUser = await entraAuthService.enrichUserWithProfile(vedUser, context);

    context.log(`Successfully authenticated user: ${enrichedUser.email}`);
    return enrichedUser;
  } catch (error: any) {
    context.log(`Authentication failed: ${error?.message || 'Unknown error'}`);
    throw new Error(`Authentication failed: ${error?.message || 'Unknown error'}`);
  }
}

export default entraAuthService;
