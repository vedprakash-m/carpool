"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const error_handler_1 = require("../utils/error-handler");
// Helper function to convert UserRecord to User (removes passwordHash)
function sanitizeUser(userRecord) {
    const { passwordHash, ...user } = userRecord;
    return user;
}
// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "default-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
const JWT_EXPIRES_IN = "24h";
const JWT_REFRESH_EXPIRES_IN = "7d";
// Role permissions mapping
const ROLE_PERMISSIONS = {
    admin: [
        "create_users",
        "generate_schedule",
        "view_all_data",
        "manage_system",
        "manage_groups",
        "manage_roles",
    ],
    group_admin: [
        "manage_group",
        "assign_trips",
        "view_group_data",
        "manage_group_members",
        "submit_preferences",
    ],
    parent: [
        "submit_preferences",
        "view_own_trips",
        "manage_children",
        "edit_profile",
        "view_group_schedule",
    ],
    child: [
        "view_own_schedule",
        "update_limited_profile",
        "view_assignments",
    ],
};
class AuthService {
    userRepository;
    logger;
    constructor(userRepository, logger) {
        this.userRepository = userRepository;
        this.logger = logger;
    }
    static generateAccessToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: [...ROLE_PERMISSIONS[user.role]],
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    static generateRefreshToken(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: [...ROLE_PERMISSIONS[user.role]],
        };
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
        });
    }
    generateAccessTokenInstance(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: [...ROLE_PERMISSIONS[user.role]],
        };
        return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });
    }
    generateRefreshTokenInstance(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            permissions: [...ROLE_PERMISSIONS[user.role]],
        };
        return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRES_IN,
        });
    }
    /**
     * Hash password using bcrypt
     */
    async hashPasswordInstance(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    /**
     * Verify password against hash
     */
    async verifyPasswordInstance(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Verify and decode JWT access token
     */
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized("Invalid or expired token");
        }
    }
    /**
     * Verify and decode JWT refresh token
     */
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized("Invalid or expired refresh token");
        }
    }
    /**
     * Extract token from Authorization header
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verify the refresh token
            const payload = this.verifyRefreshToken(refreshToken);
            // Get user from database
            const user = await this.userRepository.findById(payload.userId);
            if (!user) {
                throw error_handler_1.Errors.NotFound("User not found");
            }
            // Generate new access token
            const accessToken = this.generateAccessTokenInstance(user);
            return { accessToken, user };
        }
        catch (error) {
            throw error_handler_1.Errors.Unauthorized("Invalid refresh token");
        }
    }
    /**
     * Register a new user
     */
    async register(userData) {
        // Minimal implementation: hash password, create user, return user
        const passwordHash = await this.hashPassword(userData.password);
        const user = {
            ...userData,
            id: `user-${Date.now()}`,
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: userData.role || "parent",
            preferences: userData.preferences || {},
        };
        // In a real implementation, save to DB
        await this.userRepository.create(user);
        return user;
    }
    /**
     * Login a user
     */
    async login(email, password) {
        const userRecord = (await this.userRepository.findByEmail(email));
        if (!userRecord)
            throw error_handler_1.Errors.Unauthorized("Invalid credentials");
        const valid = await this.verifyPasswordInstance(password, userRecord.passwordHash);
        if (!valid)
            throw error_handler_1.Errors.Unauthorized("Invalid credentials");
        const user = sanitizeUser(userRecord);
        const accessToken = this.generateAccessTokenInstance(user);
        const refreshToken = this.generateRefreshTokenInstance(user);
        return { user, accessToken, refreshToken };
    }
    /**
     * Generate a password reset token
     */
    async generatePasswordResetToken(user) {
        // For demo, just sign a JWT with a short expiry
        return jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    }
    /**
     * Verify a password reset token
     */
    verifyPasswordResetToken(token) {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    /**
     * Hash a password
     */
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, 12);
    }
    /**
     * Change a user's password
     */
    async changePassword(userId, oldPassword, newPassword) {
        const userRecord = (await this.userRepository.findById(userId));
        if (!userRecord)
            throw error_handler_1.Errors.NotFound("User not found");
        const valid = await this.verifyPasswordInstance(oldPassword, userRecord.passwordHash);
        if (!valid)
            throw error_handler_1.Errors.Unauthorized("Invalid current password");
        userRecord.passwordHash = await this.hashPassword(newPassword);
        await this.userRepository.update(userId, userRecord);
    }
}
exports.AuthService = AuthService;
