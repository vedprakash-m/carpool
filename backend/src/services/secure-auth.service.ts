/**
 * Enhanced Authentication Service with Rate Limiting and Database Integration
 * Replaces the existing unified-auth.service.ts with secure practices
 */

import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { databaseService, User } from "./database.service";
import { configService } from "./config.service";

export interface AuthResult {
  success: boolean;
  user?: Omit<User, "passwordHash">;
  token?: string;
  message?: string;
  remainingAttempts?: number;
  lockoutTime?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "parent" | "student";
  phoneNumber?: string;
  address?: string;
}

class SecureAuthService {
  private static instance: SecureAuthService;

  private constructor() {}

  public static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
  }

  /**
   * Authenticate user with rate limiting and account lockout protection
   */
  public async authenticate(
    credentials: LoginCredentials
  ): Promise<AuthResult> {
    const { email, password } = credentials;

    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Check if account is locked
      const isLocked = await databaseService.isAccountLocked(normalizedEmail);
      if (isLocked) {
        const config = configService.getConfig();
        return {
          success: false,
          message: `Account is locked due to too many failed login attempts. Please try again after ${config.auth.lockoutDuration} minutes.`,
          lockoutTime: config.auth.lockoutDuration,
        };
      }

      // Get user from database
      const user = await databaseService.getUserByEmail(normalizedEmail);
      if (!user) {
        // Record failed attempt even for non-existent users to prevent enumeration
        await databaseService.recordLoginAttempt(normalizedEmail);
        return {
          success: false,
          message: "Invalid email or password",
          remainingAttempts: await this.getRemainingAttempts(normalizedEmail),
        };
      }

      // Check if user account is active
      if (!user.isActive) {
        await databaseService.recordLoginAttempt(normalizedEmail);
        return {
          success: false,
          message: "Account is deactivated. Please contact support.",
          remainingAttempts: await this.getRemainingAttempts(normalizedEmail),
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await databaseService.recordLoginAttempt(normalizedEmail);
        return {
          success: false,
          message: "Invalid email or password",
          remainingAttempts: await this.getRemainingAttempts(normalizedEmail),
        };
      }

      // Successful login - clear any failed attempts
      await databaseService.clearLoginAttempts(normalizedEmail);

      // Generate JWT token
      const token = this.generateJwtToken(user);

      // Update user's last login timestamp
      await databaseService.updateUser(normalizedEmail, {
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: "Login successful",
      };
    } catch (error) {
      console.error("Authentication error:", error);
      return {
        success: false,
        message: "An error occurred during authentication. Please try again.",
      };
    }
  }

  /**
   * Register a new user with validation and security checks
   */
  public async register(registerData: RegisterData): Promise<AuthResult> {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        phoneNumber,
        address,
      } = registerData;

      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();

      // Validate email format
      if (!this.isValidEmail(normalizedEmail)) {
        return {
          success: false,
          message: "Please provide a valid email address",
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Check if user already exists
      const existingUser = await databaseService.getUserByEmail(
        normalizedEmail
      );
      if (existingUser) {
        return {
          success: false,
          message: "An account with this email already exists",
        };
      }

      // Hash password
      const config = configService.getConfig();
      const passwordHash = await bcrypt.hash(
        password,
        config.auth.bcryptRounds
      );

      // Create user
      const newUser = await databaseService.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        phoneNumber: phoneNumber?.trim(),
        address: address?.trim(),
        isActive: true,
      });

      // Generate JWT token
      const token = this.generateJwtToken(newUser);

      return {
        success: true,
        user: this.sanitizeUser(newUser),
        token,
        message: "Account created successfully",
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "An error occurred during registration. Please try again.",
      };
    }
  }

  /**
   * Verify JWT token and return user information
   */
  public async verifyToken(token: string): Promise<{
    valid: boolean;
    user?: Omit<User, "passwordHash">;
    message?: string;
  }> {
    try {
      const config = configService.getConfig();
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;

      // Get fresh user data from database
      const user = await databaseService.getUserByEmail(decoded.email);
      if (!user || !user.isActive) {
        return {
          valid: false,
          message: "User not found or account deactivated",
        };
      }

      return {
        valid: true,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          message: "Token has expired",
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          message: "Invalid token",
        };
      } else {
        console.error("Token verification error:", error);
        return {
          valid: false,
          message: "Token verification failed",
        };
      }
    }
  }

  /**
   * Generate JWT token for authenticated user
   */
  private generateJwtToken(user: User): string {
    const config = configService.getConfig();
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Ensure JWT secret is properly typed
    const jwtSecret = config.auth.jwtSecret;
    if (!jwtSecret) {
      throw new Error("JWT secret is not configured");
    }

    return jwt.sign(payload, jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: "vcarpool-app",
      subject: user.id,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token and return user payload
   */
  public verifyJwtToken(token: string): {
    isValid: boolean;
    payload?: any;
    message?: string;
  } {
    try {
      const config = configService.getConfig();
      const payload = jwt.verify(token, config.auth.jwtSecret);

      return {
        isValid: true,
        payload,
      };
    } catch (error) {
      let message = "Invalid token";

      if (error instanceof jwt.TokenExpiredError) {
        message = "Token has expired";
      } else if (error instanceof jwt.JsonWebTokenError) {
        message = "Invalid token format";
      }

      return {
        isValid: false,
        message,
      };
    }
  }

  /**
   * Remove sensitive information from user object
   */
  private sanitizeUser(user: User): Omit<User, "passwordHash"> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Get remaining login attempts before lockout
   */
  private async getRemainingAttempts(email: string): Promise<number> {
    const config = configService.getConfig();
    const currentAttempts = await databaseService.getLoginAttempts(email);
    return Math.max(0, config.auth.maxLoginAttempts - currentAttempts);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): {
    isValid: boolean;
    message?: string;
  } {
    if (password.length < 8) {
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        message: "Password must contain at least one number",
      };
    }

    // Check for common weak passwords and patterns
    const commonPasswords = [
      "password",
      "12345678",
      "qwerty",
      "abc123",
      "password123",
      "admin123",
      "letmein",
      "welcome",
      "monkey",
      "dragon",
    ];

    // Check for common patterns that are weak
    const weakPatterns = [
      /^password\d+$/i, // password123, Password123, etc.
      /^admin\d+$/i, // admin123, Admin123, etc.
      /^welcome\d+$/i, // welcome123, Welcome123, etc.
      /^letmein\d+$/i, // letmein123, Letmein123, etc.
      /^qwerty\d+$/i, // qwerty123, Qwerty123, etc.
      /^(test|demo|sample)\d+$/i, // test123, Demo123, etc.
    ];

    if (
      commonPasswords.includes(password.toLowerCase()) ||
      weakPatterns.some((pattern) => pattern.test(password))
    ) {
      return {
        isValid: false,
        message: "Please choose a stronger, less common password",
      };
    }

    return { isValid: true };
  }

  /**
   * Change user password with validation
   */
  public async changePassword(
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Get user and verify current password
      const user = await databaseService.getUserByEmail(normalizedEmail);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: "Current password is incorrect",
        };
      }

      // Validate new password
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message,
        };
      }

      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash
      );
      if (isSamePassword) {
        return {
          success: false,
          message: "New password must be different from your current password",
        };
      }

      // Hash new password and update user
      const config = configService.getConfig();
      const newPasswordHash = await bcrypt.hash(
        newPassword,
        config.auth.bcryptRounds
      );

      await databaseService.updateUser(normalizedEmail, {
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Password change error:", error);
      return {
        success: false,
        message: "An error occurred while changing password. Please try again.",
      };
    }
  }

  /**
   * Get authentication service status and statistics
   */
  public async getServiceStatus(): Promise<any> {
    try {
      const dbHealth = await databaseService.healthCheck();
      const config = configService.getConfig();

      return {
        status: "healthy",
        database: dbHealth,
        configuration: {
          environment: config.app.environment,
          jwtExpiresIn: config.auth.jwtExpiresIn,
          maxLoginAttempts: config.auth.maxLoginAttempts,
          lockoutDuration: config.auth.lockoutDuration,
          hasRealGeocoding: configService.hasRealGeocoding(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        message: "Service health check failed",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const secureAuthService = SecureAuthService.getInstance();
export default secureAuthService;
