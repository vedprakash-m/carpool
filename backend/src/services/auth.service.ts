import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '@carpool/shared';
import { UserRepository } from '../repositories/user.repository';
import { Errors } from '../utils/error-handler';
import { ILogger } from '../utils/logger';

// Internal type for database records that include password hash
interface UserRecord extends User {
  passwordHash: string;
}

// Helper function to convert UserRecord to User (removes passwordHash)
function sanitizeUser(userRecord: UserRecord): User {
  const { passwordHash, ...user } = userRecord;
  return user;
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  admin: [
    'create_users',
    'generate_schedule',
    'view_all_data',
    'manage_system',
    'manage_groups',
    'manage_roles',
    'platform_management',
    'group_admin_promotion',
    'system_configuration',
  ] as const,
  group_admin: [
    'manage_group',
    'assign_trips',
    'view_group_data',
    'manage_group_members',
    'submit_preferences',
    'manage_family',
    'emergency_response',
    'schedule_management',
    'group_management',
    'member_management',
    'trip_scheduling',
    'emergency_coordination',
  ] as const,
  parent: [
    'submit_preferences',
    'view_own_trips',
    'manage_children',
    'edit_profile',
    'view_group_schedule',
    'manage_family',
    'emergency_response',
    'crisis_coordination',
    'trip_participation',
    'preference_submission',
    'child_management',
  ] as const,
  child: [
    'view_own_schedule',
    'update_limited_profile',
    'view_assignments',
    'schedule_viewing',
    'safety_reporting',
    'profile_management',
  ] as const,
  student: [
    'view_own_schedule',
    'update_limited_profile',
    'view_assignments',
    'schedule_viewing',
    'safety_reporting',
    'profile_management',
  ] as const,
  trip_admin: [
    'group_management',
    'member_management',
    'trip_scheduling',
    'emergency_coordination',
    'manage_group',
    'assign_trips',
    'view_group_data',
    'manage_group_members',
    'manage_trip',
    'assign_passengers',
    'view_trip_data',
    'manage_trip_schedule',
    'submit_preferences',
  ] as const,
};

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: readonly string[];
  iat?: number;
  exp?: number;
}

export class AuthService {
  private userRepository: UserRepository;
  private logger: ILogger;

  constructor(userRepository: UserRepository, logger: ILogger) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  static generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: [...ROLE_PERMISSIONS[user.role]],
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: [...ROLE_PERMISSIONS[user.role]],
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
  }

  generateAccessTokenInstance(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: [...ROLE_PERMISSIONS[user.role]],
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  generateRefreshTokenInstance(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: [...ROLE_PERMISSIONS[user.role]],
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
  }

  /**
   * Hash password using bcrypt
   */
  async hashPasswordInstance(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPasswordInstance(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized('Invalid or expired token');
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: User }> {
    try {
      // Verify the refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw Errors.NotFound('User not found');
      }

      // Generate new access token
      const accessToken = this.generateAccessTokenInstance(user);

      return { accessToken, user };
    } catch (error) {
      throw Errors.Unauthorized('Invalid refresh token');
    }
  }

  /**
   * Register a new user
   */
  async register(userData: any): Promise<User> {
    // Minimal implementation: hash password, create user, return user
    const passwordHash = await this.hashPassword(userData.password);
    const user: User = {
      ...userData,
      id: `user-${Date.now()}`,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: userData.role || 'parent',
      preferences: userData.preferences || {},
    };
    // In a real implementation, save to DB
    await this.userRepository.create(user);
    return user;
  }

  /**
   * Login a user
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const userRecord = (await this.userRepository.findByEmail(email)) as UserRecord | null;
    if (!userRecord) throw Errors.Unauthorized('Invalid credentials');
    const valid = await this.verifyPasswordInstance(password, userRecord.passwordHash);
    if (!valid) throw Errors.Unauthorized('Invalid credentials');
    const user = sanitizeUser(userRecord);
    const accessToken = this.generateAccessTokenInstance(user);
    const refreshToken = this.generateRefreshTokenInstance(user);
    return { user, accessToken, refreshToken };
  }

  /**
   * Generate a password reset token
   */
  async generatePasswordResetToken(user: User): Promise<string> {
    // For demo, just sign a JWT with a short expiry
    return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  }

  /**
   * Verify a password reset token
   */
  verifyPasswordResetToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Change a user's password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const userRecord = (await this.userRepository.findById(userId)) as UserRecord | null;
    if (!userRecord) throw Errors.NotFound('User not found');
    const valid = await this.verifyPasswordInstance(oldPassword, userRecord.passwordHash);
    if (!valid) throw Errors.Unauthorized('Invalid current password');
    userRecord.passwordHash = await this.hashPassword(newPassword);
    await this.userRepository.update(userId, userRecord);
  }
}
