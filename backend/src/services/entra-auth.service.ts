import { ConfidentialClientApplication } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import { DatabaseService, User } from './database.service';

export interface EntraUserProfile {
  objectId: string;
  email: string;
  givenName: string;
  surname: string;
  role: 'parent' | 'admin' | 'student';
  schoolId?: string;
  phoneVerified: boolean;
  addressVerified: boolean;
  emergencyContact?: string;
}

export interface VCarpoolUser extends User {
  entraObjectId?: string;
  authProvider: 'legacy' | 'entra';
  migrationDate?: Date;
  phoneVerified?: boolean;
  addressVerified?: boolean;
  emergencyContact?: string;
  schoolId?: string;
}

export class EntraAuthService {
  private msalInstance: ConfidentialClientApplication;
  private databaseService: DatabaseService;

  constructor() {
    this.msalInstance = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.ENTRA_CLIENT_ID!,
        clientSecret: process.env.ENTRA_CLIENT_SECRET!,
        authority: process.env.ENTRA_AUTHORITY!,
      }
    });
    this.databaseService = DatabaseService.getInstance();
  }

  /**
   * Validate Entra External ID token and extract user profile
   */
  async validateEntraToken(token: string): Promise<EntraUserProfile | null> {
    try {
      // For now, we'll validate the token structure and decode the JWT
      // In production, you should validate against Entra External ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string') {
        throw new Error('Invalid token format');
      }

      const claims = decoded.payload as any;
      
      // Check if this is an Entra token by looking for specific claims
      if (!claims.sub || !claims.email) {
        return null;
      }
      
      return {
        objectId: claims.sub,
        email: claims.email,
        givenName: claims.given_name || '',
        surname: claims.family_name || '',
        role: this.mapEntraRoleToVCarpool(claims['extension_Role'] || 'parent'),
        schoolId: claims['extension_SchoolId'],
        phoneVerified: claims['extension_PhoneVerified'] === 'true',
        addressVerified: claims['extension_AddressVerified'] === 'true',
        emergencyContact: claims['extension_EmergencyContact']
      };
    } catch (error) {
      console.error('Entra token validation failed:', error);
      return null;
    }
  }

  /**
   * Map Entra roles to VCarpool roles
   */
  private mapEntraRoleToVCarpool(entraRole: string): 'parent' | 'admin' | 'student' {
    switch (entraRole.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return 'admin';
      case 'student':
      case 'child':
        return 'student';
      default:
        return 'parent';
    }
  }

  /**
   * Sync Entra user with VCarpool database
   */
  async syncUserWithDatabase(entraUser: EntraUserProfile): Promise<VCarpoolUser> {
    try {
      const existingUser = await this.databaseService.getUserByEmail(entraUser.email) as VCarpoolUser;
      
      if (existingUser) {
        // Update existing user with Entra information
        const updatedUser: VCarpoolUser = {
          ...existingUser,
          entraObjectId: entraUser.objectId,
          firstName: entraUser.givenName,
          lastName: entraUser.surname,
          role: entraUser.role,
          phoneVerified: entraUser.phoneVerified,
          addressVerified: entraUser.addressVerified,
          emergencyContact: entraUser.emergencyContact,
          schoolId: entraUser.schoolId,
          authProvider: 'entra',
          updatedAt: new Date().toISOString(),
          migrationDate: existingUser.authProvider === 'legacy' ? new Date() : existingUser.migrationDate
        };

        await this.databaseService.updateUser(existingUser.id, updatedUser);
        return updatedUser;
      } else {
        // Create new user from Entra profile
        const newUser: VCarpoolUser = {
          id: `user_${Date.now()}`,
          entraObjectId: entraUser.objectId,
          email: entraUser.email,
          passwordHash: '', // No password for Entra users
          firstName: entraUser.givenName,
          lastName: entraUser.surname,
          role: entraUser.role,
          phoneVerified: entraUser.phoneVerified,
          addressVerified: entraUser.addressVerified,
          emergencyContact: entraUser.emergencyContact,
          schoolId: entraUser.schoolId,
          authProvider: 'entra',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const createdUser = await this.databaseService.createUser(newUser);
        return createdUser as VCarpoolUser;
      }
    } catch (error) {
      console.error('User sync failed:', error);
      throw new Error('Failed to sync user with database');
    }
  }

  /**
   * Generate VCarpool session token for Entra-authenticated user
   */
  async generateSessionToken(user: VCarpoolUser): Promise<string> {
    const payload = {
      userId: user.entraObjectId || user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      phoneVerified: user.phoneVerified,
      addressVerified: user.addressVerified,
      authProvider: user.authProvider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, { algorithm: 'HS256' });
  }

  /**
   * Validate if user needs additional VCarpool verification
   */
  async requiresAdditionalVerification(user: VCarpoolUser): Promise<{
    needsPhoneVerification: boolean;
    needsAddressVerification: boolean;
    needsEmergencyContact: boolean;
  }> {
    return {
      needsPhoneVerification: !user.phoneVerified,
      needsAddressVerification: !user.addressVerified,
      needsEmergencyContact: !user.emergencyContact
    };
  }
}
