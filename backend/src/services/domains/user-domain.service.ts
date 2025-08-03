/**
 * User Domain Service - Unified User Management
 *
 * REMEDIATION: Updated to use the new unified AuthenticationService
 * instead of managing authentication logic directly.
 */

import {
  UserEntity,
  CreateUserRequest,
  AuthenticatedUser,
  AuthResult,
  AuthCredentials,
  AuthUserResponse,
  TokenValidationResult,
} from '@carpool/shared';
import { UserRole } from '@carpool/shared/dist/entities/user.entity';
import { databaseService } from '../database.service';
import { configService } from '../config.service';
import { AuthenticationService } from '../auth/authentication.service';

// VedUser interface from Entra ID
export interface VedUser {
  id: string; // Entra ID subject claim
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

export class UserDomainService {
  private static instance: UserDomainService;
  private authService: AuthenticationService;
  private readonly logger: any;
  private readonly databaseService: any;

  private constructor() {
    // Create a simple logger wrapper
    this.logger = {
      debug: (msg: string, data?: any) => console.debug(msg, data),
      info: (msg: string, data?: any) => console.info(msg, data),
      warn: (msg: string, data?: any) => console.warn(msg, data),
      error: (msg: string, error?: any) => console.error(msg, error),
      setContext: () => {},
      child: () => this.logger,
      startTimer: (label: string) => () => {},
    };

    this.databaseService = databaseService;
    this.authService = new AuthenticationService(databaseService, this.logger);
  }

  public static getInstance(): UserDomainService {
    if (!UserDomainService.instance) {
      UserDomainService.instance = new UserDomainService();
    }
    return UserDomainService.instance;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserEntity | null> {
    return await databaseService.getUserById(userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return await databaseService.getUserByEmail(email);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserEntity>,
    updatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const updatedUser = {
        ...updates,
        updatedAt: new Date(),
      };

      await databaseService.updateUser(userId, updatedUser);

      return {
        success: true,
        message: 'User profile updated successfully',
      };
    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        message: 'Failed to update user profile',
      };
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole,
    updatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await databaseService.updateUser(userId, {
        role: newRole,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'User role updated successfully',
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return {
        success: false,
        message: 'Failed to update user role',
      };
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(
    userId: string,
    deactivatedBy: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await databaseService.updateUser(userId, {
        isActive: false,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'User account deactivated successfully',
      };
    } catch (error) {
      console.error('Deactivate user error:', error);
      return {
        success: false,
        message: 'Failed to deactivate user account',
      };
    }
  }

  /**
   * Authenticate user credentials
   */
  async authenticateUser(credentials: AuthCredentials): Promise<AuthResult> {
    return this.authService.authenticate(credentials);
  }

  /**
   * Helper method for password authentication
   */
  async authenticateWithPassword(email: string, password: string): Promise<AuthResult> {
    return this.authService.authenticate({
      type: 'password',
      email,
      password,
    });
  }

  /**
   * Register new user
   */
  async registerUser(userData: CreateUserRequest): Promise<AuthResult> {
    return this.authService.registerUser(userData);
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<TokenValidationResult> {
    return this.authService.validateToken(token);
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    try {
      const resetToken = await this.authService.generatePasswordResetToken(email);
      // In a real implementation, you'd send an email with the reset token
      return {
        success: true,
        message: 'Password reset token generated successfully',
        resetToken,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate password reset token',
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(token, newPassword);
  }
}

// Export singleton instance
export const userDomainService = UserDomainService.getInstance();
