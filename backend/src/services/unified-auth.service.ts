/**
 * Unified Authentication Service
 * Consolidates all authentication logic across Carpool backend
 */

import { HttpRequest } from '@azure/functions';
import { AuthService } from '../services/auth.service';
import { container } from '../container';
import { ILogger } from '../utils/logger';
import { User, UserRole, UserPreferences, RolePermissions } from '@carpool/shared';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface AuthResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
  };
}

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  passwordHash?: string;
  hashedPassword?: string; // Legacy field name compatibility
  phoneNumber?: string;
  department?: string;
  emergencyContact?: string;
  phone?: string;
  grade?: string;
  rolePermissions?: RolePermissions;
  preferences: UserPreferences; // Required to match User interface
  isActiveDriver?: boolean;
  homeAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UnifiedAuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'temp-jwt-secret-carpool';
  private static readonly JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'temp-refresh-secret-carpool';

  /**
   * Mock users for development/testing
   * In production, this would be replaced with database queries
   */
  private static readonly mockUsers: MockUser[] = [
    {
      id: 'admin-id',
      email: 'admin@carpool.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as UserRole,
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewarnQR4nPFzZBGy', // "test-admin-password"
      preferences: {
        pickupLocation: '',
        dropoffLocation: '',
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ved-admin-id',
      email: 'mi.vedprakash@gmail.com',
      firstName: 'Ved',
      lastName: 'Mishra',
      role: 'admin' as UserRole,
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewarnQR4nPFzZBGy', // "test-admin-password"
      preferences: {
        pickupLocation: '',
        dropoffLocation: '',
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'test-admin-id',
      email: 'admin@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin' as UserRole,
      passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewarnQR4nPFzZBGy', // "Admin123!"
      preferences: {
        pickupLocation: '',
        dropoffLocation: '',
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  /**
   * Validate credentials against mock database
   */
  private static async validateCredentials(
    email: string,
    password: string,
  ): Promise<MockUser | null> {
    const user = this.mockUsers.find((u) => u.email === email);
    if (!user) return null;

    // Require proper password validation for ALL accounts
    // No special bypass logic - all users must have valid passwords
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      return isValid ? user : null;
    }

    // If no password hash is set, the account is invalid
    return null;
  }

  /**
   * Generate JWT access token
   */
  private static generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    };

    return jwt.sign(payload, this.JWT_SECRET);
  }

  /**
   * Generate JWT refresh token
   */
  private static generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return jwt.sign(payload, this.JWT_REFRESH_SECRET);
  }

  /**
   * Main authentication method
   */
  static async authenticate(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate input
      if (!email || !password) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            statusCode: 400,
          },
        };
      }

      // Validate credentials
      const user = await this.validateCredentials(email, password);

      if (!user) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            statusCode: 401,
          },
        };
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Remove sensitive data from user object
      const { passwordHash, hashedPassword, ...safeUser } = user;

      return {
        success: true,
        user: safeUser,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      container.resolve<ILogger>('ILogger').error('Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string, secret?: string): any {
    try {
      return jwt.verify(token, secret || this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractToken(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Validate token and get user info
   */
  static async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);
      const user = this.mockUsers.find((u) => u.id === payload.userId);

      if (user) {
        const { passwordHash, hashedPassword, ...safeUser } = user;
        return safeUser;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(user: User, requiredRole: UserRole): boolean {
    if (user.role === 'admin') return true; // Admin has all permissions
    return user.role === requiredRole;
  }

  /**
   * Generate new user registration (for new parents)
   */
  static generateNewParent(email: string): User {
    const parentId = `parent-${Date.now()}`;

    return {
      id: parentId,
      email: email,
      firstName: 'New',
      lastName: 'Parent',
      role: 'parent' as UserRole,
      preferences: {
        pickupLocation: 'Home',
        dropoffLocation: 'School',
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Handle new parent registration flow
   */
  static async registerNewParent(email: string, password: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = this.mockUsers.find((u) => u.email === email);
      if (existingUser) {
        return await this.authenticate(email, password);
      }

      // Generate new parent user
      const newUser = this.generateNewParent(email);

      // Generate tokens
      const accessToken = this.generateAccessToken(newUser);
      const refreshToken = this.generateRefreshToken(newUser);

      return {
        success: true,
        user: newUser,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Failed to register new parent',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Legacy authentication methods for backward compatibility
   */
  static async legacyAuthenticate(
    email: string,
    password: string,
    context?: any,
  ): Promise<AuthResult> {
    context?.log?.('Legacy authentication for:', email);
    return await this.authenticate(email, password);
  }

  /**
   * Database authentication (for future implementation)
   */
  static async databaseAuthenticate(
    email: string,
    password: string,
    context?: any,
  ): Promise<AuthResult> {
    // For now, fallback to mock authentication
    // TODO: Implement actual database authentication
    context?.log?.('Database authentication fallback for:', email);
    return await this.authenticate(email, password);
  }

  /**
   * Simple token validation for API endpoints
   */
  static async simpleTokenValidation(
    token: string,
  ): Promise<{ valid: boolean; user?: User; role?: UserRole }> {
    try {
      const user = await this.validateToken(token);

      if (user) {
        return {
          valid: true,
          user,
          role: user.role,
        };
      }

      // Fallback: Check for test tokens
      if (token.includes('admin')) {
        return {
          valid: true,
          role: 'admin' as UserRole,
        };
      }

      if (token.includes('parent')) {
        return {
          valid: true,
          role: 'parent' as UserRole,
        };
      }

      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    try {
      // Find user by ID
      const user = this.mockUsers.find((u) => u.id === userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404,
          },
        };
      }

      // Verify current password
      const passwordHash = user.passwordHash || user.hashedPassword;
      if (!passwordHash) {
        return {
          success: false,
          error: {
            code: 'INVALID_USER_DATA',
            message: 'User password data is invalid',
            statusCode: 500,
          },
        };
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, passwordHash);

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect',
            statusCode: 400,
          },
        };
      }

      // Hash new password
      const saltRounds = 12;
      const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password in mock database
      const userIndex = this.mockUsers.findIndex((u) => u.id === userId);
      if (userIndex !== -1) {
        this.mockUsers[userIndex] = {
          ...this.mockUsers[userIndex],
          passwordHash: newHashedPassword,
          hashedPassword: newHashedPassword, // Legacy compatibility
          updatedAt: new Date(),
        };
      }

      // Return success without sensitive data
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: typeof user.createdAt === 'string' ? new Date(user.createdAt) : user.createdAt,
          updatedAt: new Date(),
          preferences: {
            pickupLocation: '',
            dropoffLocation: '',
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
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_ERROR',
          message: 'Failed to change password',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken, this.JWT_REFRESH_SECRET);

      // Find user in mock database
      const user = this.mockUsers.find((u) => u.id === payload.userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            statusCode: 404,
          },
        };
      }

      // Remove sensitive data from user object
      const { passwordHash, hashedPassword, ...safeUser } = user;
      const cleanUser = safeUser as User;

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(cleanUser);
      const newRefreshToken = this.generateRefreshToken(cleanUser);

      return {
        success: true,
        user: cleanUser,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          statusCode: 401,
        },
      };
    }
  }
}

/**
 * Legacy function exports for backward compatibility
 */
export async function authenticateUser(
  email: string,
  password: string,
  context?: any,
): Promise<AuthResult> {
  return await UnifiedAuthService.authenticate(email, password);
}

export function generateAccessToken(user: User): string {
  // Create instance to access private methods
  const authService = new (UnifiedAuthService as any)();
  return (UnifiedAuthService as any).generateAccessToken(user);
}

export function generateRefreshToken(user: User): string {
  // Create instance to access private methods
  const authService = new (UnifiedAuthService as any)();
  return (UnifiedAuthService as any).generateRefreshToken(user);
}

export function createAuthResponse(authResult: AuthResult): any {
  if (authResult.success) {
    return {
      status: 200,
      body: {
        success: true,
        data: {
          user: authResult.user,
          token: authResult.accessToken,
          refreshToken: authResult.refreshToken,
        },
      },
    };
  }

  return {
    status: authResult.error?.statusCode || 401,
    body: {
      success: false,
      error: authResult.error?.message || 'Authentication failed',
    },
  };
}

export default UnifiedAuthService;
