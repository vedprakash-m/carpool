/**
 * Master Authentication Service
 *
 * Unified implementation that replaces all fragmented authentication services:
 * - AuthService (container-based)
 * - SecureAuthService (singleton)
 * - UnifiedAuthService (static)
 * - EntraAuthService (hybrid)
 */

import * as bcrypt from 'bcrypt';
import {
  IAuthenticationService,
  AuthCredentials,
  AuthResult,
  TokenValidationResult,
  AuthUserResponse,
  IJWTService,
  IPasswordValidator,
  UserEntity,
  UserRole,
  AuthProvider,
  CreateUserRequest,
} from '@carpool/shared';
import { JWTService } from './jwt.service';
import { DatabaseService } from '../database.service';
import { tokenBlacklist } from './token-blacklist';
import { ILogger } from '../../utils/logger';
import * as jwt from 'jsonwebtoken';

/**
 * Password Validator Implementation
 */
export class PasswordValidator implements IPasswordValidator {
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true };
  }
}

/**
 * Master Authentication Service
 */
export class AuthenticationService implements IAuthenticationService {
  private readonly jwtService: IJWTService;
  private readonly passwordValidator: IPasswordValidator;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly logger: ILogger,
    jwtService?: IJWTService,
  ) {
    this.jwtService = jwtService || new JWTService();
    this.passwordValidator = new PasswordValidator();
  }

  /**
   * Authenticate user with various credential types
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'password':
          return this.authenticateWithPassword(credentials);
        case 'entra_token':
          return this.authenticateWithEntraToken(credentials);
        case 'refresh_token':
          return this.authenticateWithRefreshToken(credentials);
        default:
          return {
            success: false,
            message: 'Unsupported authentication type',
          };
      }
    } catch (error) {
      this.logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        message: 'Authentication failed. Please try again.',
      };
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    if (tokenBlacklist.has(token)) {
      return {
        valid: false,
        message: 'Token has been revoked',
      };
    }
    try {
      const payload = await this.jwtService.validateAccessToken(token);

      // Get fresh user data from database
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user || !user.isActive) {
        return {
          valid: false,
          message: 'User not found or account deactivated',
        };
      }

      const authUser = this.mapToAuthUserResponse(user);

      return {
        valid: true,
        user: authUser,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = await this.jwtService.validateAccessToken(token);

      // Check if token is blacklisted
      if (tokenBlacklist.has(token)) {
        return {
          valid: false,
          message: 'Token has been revoked',
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = await this.jwtService.validateRefreshToken(refreshToken);

      // Get fresh user data
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'User not found or account deactivated',
        };
      }

      // Generate new tokens
      const accessToken = this.jwtService.generateAccessToken(user);
      const newRefreshToken = this.jwtService.generateRefreshToken(user);

      return {
        success: true,
        user: this.mapToAuthUserResponse(user),
        accessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired refresh token',
      };
    }
  }

  /**
   * Revoke token (logout)
   */
  async revokeToken(token: string): Promise<void> {
    const decodedToken = jwt.decode(token);
    if (decodedToken && typeof decodedToken === 'object' && decodedToken.exp) {
      const expiry = decodedToken.exp - Math.floor(Date.now() / 1000);
      if (expiry > 0) {
        tokenBlacklist.add(token, expiry);
      }
    }
    this.logger.info('Token revoked', { token: token.substring(0, 10) + '...' });
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.databaseService.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    return (this.jwtService as JWTService).generatePasswordResetToken(user);
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message?: string; error?: string; resetToken?: string }> {
    try {
      const user = await this.databaseService.getUserByEmail(email);
      if (!user) {
        // Return success even if user not found (security best practice)
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent',
        };
      }

      // Generate reset token
      const resetToken = await this.generatePasswordResetToken(email);

      // TODO: Send email with reset link

      return {
        success: true,
        message: 'Password reset token generated',
        resetToken,
      };
    } catch (error) {
      this.logger.error('Error requesting password reset:', error);
      return {
        success: false,
        error: 'Failed to process password reset request',
      };
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate password strength
      const passwordValidation = this.passwordValidator.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message || 'Invalid password',
        };
      }

      // Validate reset token
      const payload = await this.jwtService.validateAccessToken(token);

      // Get user and update password
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const hashedPassword = await this.passwordValidator.hashPassword(newPassword);
      await this.databaseService.updateUser(user.id, { passwordHash: hashedPassword });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }
  }

  /**
   * Hash password using internal password validator
   */
  async hashPassword(password: string): Promise<string> {
    return this.passwordValidator.hashPassword(password);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.passwordValidator.verifyPassword(password, hash);
  }

  async registerUser(request: CreateUserRequest): Promise<AuthResult> {
    try {
      // Hash password if provided
      let passwordHash: string | undefined;
      if (request.password) {
        const passwordValidation = this.passwordValidator.validatePasswordStrength(
          request.password,
        );
        if (!passwordValidation.valid) {
          return {
            success: false,
            message: passwordValidation.message || 'Invalid password',
          };
        }
        passwordHash = await this.passwordValidator.hashPassword(request.password);
      }

      // Create user entity
      const userEntity: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> = {
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        role: request.role,
        authProvider: request.password ? 'legacy' : 'entra',
        passwordHash,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        emergencyContacts: [],
        familyId: undefined,
        groupMemberships: [],
        addressVerified: false,
        phoneNumber: request.phoneNumber,
        homeAddress: request.homeAddress,
        isActiveDriver: request.isActiveDriver || false,
        preferences: {
          isDriver: request.isActiveDriver || false,
          notifications: {
            email: true,
            sms: false,
            tripReminders: true,
            swapRequests: true,
            scheduleChanges: true,
          },
        },
        loginAttempts: 0,
      };

      // Create user in database
      const newUser = await this.databaseService.createUser(userEntity);

      // Generate tokens
      const accessToken = this.jwtService.generateAccessToken(newUser);
      const refreshToken = this.jwtService.generateRefreshToken(newUser);

      return {
        success: true,
        user: this.mapToAuthUserResponse(newUser),
        accessToken,
        refreshToken,
        message: 'User registered successfully',
      };
    } catch (error) {
      this.logger.error('User registration error:', error);
      return {
        success: false,
        message: 'User registration failed. Please try again.',
      };
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get user
      const user = await this.databaseService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify old password
      const isOldPasswordValid = await this.verifyPassword(oldPassword, user.passwordHash || '');
      if (!isOldPasswordValid) {
        return { success: false, error: 'Invalid current password' };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update user's password
      await this.databaseService.updateUser(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      this.logger.error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password',
      };
    }
  }

  /**
   * Get JWT service instance (for access to specific JWT methods)
   */
  getJWTService(): IJWTService {
    return this.jwtService;
  }

  /**
   * Authenticate with email/password
   */
  private async authenticateWithPassword(credentials: AuthCredentials): Promise<AuthResult> {
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: 'Email and password are required',
      };
    }

    const user = await this.databaseService.getUserByEmail(credentials.email);
    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        message: 'Password authentication not available for this account',
      };
    }

    const isPasswordValid = await this.passwordValidator.verifyPassword(
      credentials.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    return {
      success: true,
      user: this.mapToAuthUserResponse(user),
      accessToken,
      refreshToken,
      message: 'Authentication successful',
    };
  }

  /**
   * Authenticate with Entra ID token (placeholder)
   */
  private async authenticateWithEntraToken(credentials: AuthCredentials): Promise<AuthResult> {
    // TODO: Implement proper Entra ID token validation
    return {
      success: false,
      message: 'Entra ID authentication not yet implemented',
    };
  }

  /**
   * Authenticate with refresh token
   */
  private async authenticateWithRefreshToken(credentials: AuthCredentials): Promise<AuthResult> {
    if (!credentials.token) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }

    return this.rotateRefreshToken(credentials.token);
  }

  private usedRefreshTokens: Set<string> = new Set();

  /**
   * Authenticate with refresh token
   */
  private async rotateRefreshToken(token: string): Promise<AuthResult> {
    if (this.usedRefreshTokens.has(token)) {
      return {
        success: false,
        message: 'Refresh token has already been used',
      };
    }

    try {
      const payload = await this.jwtService.validateRefreshToken(token);

      // Get fresh user data
      const user = await this.databaseService.getUserByEmail(payload.email);
      if (!user || !user.isActive) {
        return {
          success: false,
          message: 'User not found or account deactivated',
        };
      }

      // Add the used token to the blacklist
      this.usedRefreshTokens.add(token);

      // Generate new tokens
      const accessToken = this.jwtService.generateAccessToken(user);
      const newRefreshToken = this.jwtService.generateRefreshToken(user);

      return {
        success: true,
        user: this.mapToAuthUserResponse(user),
        accessToken,
        refreshToken: newRefreshToken,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired refresh token',
      };
    }
  }

  /**
   * Map UserEntity to AuthUserResponse (remove sensitive data)
   */
  private mapToAuthUserResponse(user: UserEntity): AuthUserResponse {
    const permissions = this.getPermissionsForRole(user.role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      authProvider: user.authProvider,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      phoneNumber: user.phoneNumber,
      emergencyContacts: user.emergencyContacts,
      profilePictureUrl: user.profilePictureUrl,
      familyId: user.familyId,
      groupMemberships: user.groupMemberships,
      homeAddress: user.homeAddress,
      homeLocation: user.homeLocation,
      addressVerified: user.addressVerified,
      isActiveDriver: user.isActiveDriver,
      preferences: user.preferences,
      travelSchedule: user.travelSchedule,
      loginAttempts: user.loginAttempts,
      lastLoginAt: user.lastLoginAt,
      lastActivityAt: user.lastActivityAt,
      verification: user.verification,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions,
    };
  }

  /**
   * Get permissions for user role
   */
  private getPermissionsForRole(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      super_admin: [
        'admin:read',
        'admin:write',
        'admin:delete',
        'groups:manage',
        'users:manage',
        'system:manage',
        'trips:manage',
        'notifications:manage',
      ],
      group_admin: [
        'groups:read',
        'groups:write',
        'groups:manage_own',
        'trips:read',
        'trips:write',
        'users:read_group',
        'notifications:send_group',
      ],
      parent: [
        'profile:read',
        'profile:write',
        'groups:read',
        'groups:join',
        'trips:read',
        'trips:participate',
        'preferences:manage',
        'children:manage',
      ],
      student: ['profile:read', 'trips:read', 'trips:participate'],
    };

    return permissions[role] || permissions.parent;
  }
}

// Export singleton instance for backward compatibility during migration
export const authenticationService = new AuthenticationService(
  DatabaseService.getInstance(),
  console as any, // Temporary logger
);
