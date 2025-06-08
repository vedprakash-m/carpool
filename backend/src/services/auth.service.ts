import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User, UserRole } from "@vcarpool/shared";
import { UserRepository } from "../repositories/user.repository";
import { Errors } from "../utils/error-handler";
import { ILogger } from "../utils/logger";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
const JWT_EXPIRES_IN = "24h";
const JWT_REFRESH_EXPIRES_IN = "7d";

// Role permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  admin: [
    "create_users",
    "generate_schedule",
    "view_all_data",
    "manage_system",
    "manage_groups",
    "manage_roles",
  ] as const,
  group_admin: [
    "manage_group",
    "assign_trips",
    "view_group_data",
    "manage_group_members",
    "submit_preferences",
  ] as const,
  parent: [
    "submit_preferences",
    "view_own_trips",
    "manage_children",
    "edit_profile",
    "view_group_schedule",
  ] as const,
  child: [
    "view_own_schedule",
    "update_limited_profile",
    "view_assignments",
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
  async verifyPasswordInstance(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Verify and decode JWT access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized("Invalid or expired token");
    }
  }

  /**
   * Verify and decode JWT refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      throw Errors.Unauthorized("Invalid or expired refresh token");
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; user: User }> {
    try {
      // Verify the refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw Errors.NotFound("User not found");
      }

      // Generate new access token
      const accessToken = this.generateAccessTokenInstance(user);

      return { accessToken, user };
    } catch (error) {
      throw Errors.Unauthorized("Invalid refresh token");
    }
  }
}
