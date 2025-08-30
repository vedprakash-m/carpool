/**
 * User Provisioning Service
 *
 * This service handles the creation of Microsoft Entra ID accounts in the VED domain
 * during the carpool registration process.
 *
 * Flow:
 * 1. Parent completes onboarding (family info, address, children)
 * 2. System provisions Microsoft accounts for parent and children
 * 3. Users can then login with their Microsoft accounts
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { User } from '@microsoft/microsoft-graph-types';

export interface UserProvisioningRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'parent' | 'student';
  familyId: string;
  temporaryPassword?: string;
}

export interface ProvisioningResult {
  success: boolean;
  microsoftUserId?: string;
  email: string;
  temporaryPassword?: string;
  message: string;
  error?: string;
}

export class UserProvisioningService {
  private graphClient: Client;
  private tenantId: string = 'vedid.onmicrosoft.com';

  constructor() {
    // Initialize Microsoft Graph client with service principal credentials
    const credential = new ClientSecretCredential(
      process.env.AZURE_AD_TENANT_ID || 'vedid.onmicrosoft.com',
      process.env.AZURE_AD_CLIENT_ID!, // App registration client ID
      process.env.AZURE_AD_CLIENT_SECRET!, // App registration client secret
    );

    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token?.token || '';
        },
      },
    });
  }

  /**
   * Provision a parent user in Microsoft Entra ID
   */
  async provisionParent(request: UserProvisioningRequest): Promise<ProvisioningResult> {
    try {
      const userPrincipalName = `${request.email}`;
      const displayName = `${request.firstName} ${request.lastName}`;
      const temporaryPassword = request.temporaryPassword || this.generateTemporaryPassword();

      const newUser: User = {
        accountEnabled: true,
        displayName,
        mailNickname: request.email.split('@')[0],
        userPrincipalName,
        givenName: request.firstName,
        surname: request.lastName,
        mail: request.email,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: temporaryPassword,
        },
        usageLocation: 'US', // Required for license assignment
        // Custom attributes for carpool app
        extension_carpool_role: 'parent',
        extension_carpool_familyId: request.familyId,
      } as User & Record<string, any>;

      const createdUser = await this.graphClient.api('/users').post(newUser);

      return {
        success: true,
        microsoftUserId: createdUser.id,
        email: request.email,
        temporaryPassword,
        message: 'Parent account created successfully in Microsoft Entra ID',
      };
    } catch (error: any) {
      console.error('Failed to provision parent user:', error);
      return {
        success: false,
        email: request.email,
        message: 'Failed to provision parent account',
        error: error.message,
      };
    }
  }

  /**
   * Provision a student user in Microsoft Entra ID
   */
  async provisionStudent(request: UserProvisioningRequest): Promise<ProvisioningResult> {
    try {
      const userPrincipalName = `${request.email}`;
      const displayName = `${request.firstName} ${request.lastName}`;
      const temporaryPassword = request.temporaryPassword || this.generateTemporaryPassword();

      const newUser: User = {
        accountEnabled: true,
        displayName,
        mailNickname: request.email.split('@')[0],
        userPrincipalName,
        givenName: request.firstName,
        surname: request.lastName,
        mail: request.email,
        passwordProfile: {
          forceChangePasswordNextSignIn: true,
          password: temporaryPassword,
        },
        usageLocation: 'US',
        // Custom attributes for carpool app
        extension_carpool_role: 'student',
        extension_carpool_familyId: request.familyId,
      } as User & Record<string, any>;

      const createdUser = await this.graphClient.api('/users').post(newUser);

      return {
        success: true,
        microsoftUserId: createdUser.id,
        email: request.email,
        temporaryPassword,
        message: 'Student account created successfully in Microsoft Entra ID',
      };
    } catch (error: any) {
      console.error('Failed to provision student user:', error);
      return {
        success: false,
        email: request.email,
        message: 'Failed to provision student account',
        error: error.message,
      };
    }
  }

  /**
   * Provision an entire family (parent + children)
   */
  async provisionFamily(familyData: {
    familyId: string;
    parent: {
      firstName: string;
      lastName: string;
      email: string;
    };
    children: Array<{
      firstName: string;
      lastName: string;
      grade: string;
    }>;
  }): Promise<{
    parent: ProvisioningResult;
    children: ProvisioningResult[];
  }> {
    const results = {
      parent: {} as ProvisioningResult,
      children: [] as ProvisioningResult[],
    };

    // Provision parent
    results.parent = await this.provisionParent({
      email: familyData.parent.email,
      firstName: familyData.parent.firstName,
      lastName: familyData.parent.lastName,
      role: 'parent',
      familyId: familyData.familyId,
    });

    // Provision children
    for (const child of familyData.children) {
      // Generate email for child based on parent domain or use a standard pattern
      const childEmail = this.generateChildEmail(
        child.firstName,
        child.lastName,
        familyData.parent.email,
      );

      const childResult = await this.provisionStudent({
        email: childEmail,
        firstName: child.firstName,
        lastName: child.lastName,
        role: 'student',
        familyId: familyData.familyId,
      });

      results.children.push(childResult);
    }

    return results;
  }

  /**
   * Check if a user already exists in Microsoft Entra ID
   */
  async userExists(email: string): Promise<boolean> {
    try {
      const user = await this.graphClient.api(`/users/${email}`).get();
      return !!user;
    } catch (error: any) {
      if (error.code === 'Request_ResourceNotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete a provisioned user (for cleanup/testing)
   */
  async deleteUser(userPrincipalName: string): Promise<boolean> {
    try {
      await this.graphClient.api(`/users/${userPrincipalName}`).delete();
      return true;
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure password has at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  /**
   * Generate email for child users
   */
  private generateChildEmail(firstName: string, lastName: string, parentEmail: string): string {
    const parentDomain = parentEmail.split('@')[1];
    const childUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    return `${childUsername}@${parentDomain}`;
  }
}

export const userProvisioningService = new UserProvisioningService();
