/**
 * Test suite for AuthService
 * Tests the core authentication functionality
 */

import "reflect-metadata";
import { AuthService, JwtPayload } from "../services/auth.service";
import { User, UserRole } from "@vcarpool/shared";
import { UserRepository } from "../repositories/user.repository";
import { ILogger } from "../utils/logger";

// Mock Logger
const mockLogger: ILogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setContext: jest.fn(),
  child: jest.fn().mockReturnThis(),
  startTimer: jest.fn().mockReturnValue({
    end: jest.fn(),
  }),
};

// Mock UserRepository
const mockUserRepository: jest.Mocked<UserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as any;

const mockUser: User = {
  id: "test-user-id",
  email: "parent@test.com",
  firstName: "Test",
  lastName: "Parent",
  role: "parent",
  preferences: {
    pickupLocation: "123 Main St",
    dropoffLocation: "456 Oak Ave",
    preferredTime: "08:00",
    isDriver: true,
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

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockUserRepository, mockLogger);
  });

  describe("password management", () => {
    it("should hash password correctly", async () => {
      const password = "testpassword123";
      const hashedPassword = await authService.hashPasswordInstance(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it("should verify password correctly", async () => {
      const password = "testpassword123";
      const hashedPassword = await authService.hashPasswordInstance(password);

      const isValid = await authService.verifyPasswordInstance(
        password,
        hashedPassword
      );
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPasswordInstance(
        "wrongpassword",
        hashedPassword
      );
      expect(isInvalid).toBe(false);
    });
  });

  describe("token generation and verification", () => {
    it("should generate and verify an access token instance", () => {
      const token = authService.generateAccessTokenInstance(mockUser);
      expect(token).toBeDefined();

      const decoded = authService.verifyAccessToken(token) as JwtPayload;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.role).toBe("parent");
      expect(decoded.permissions).toContain("submit_preferences");
    });

    it("should generate and verify a refresh token instance", () => {
      const token = authService.generateRefreshTokenInstance(mockUser);
      expect(token).toBeDefined();

      const decoded = authService.verifyRefreshToken(token) as JwtPayload;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.role).toBe("parent");
    });

    it("should throw an error for an invalid access token", () => {
      expect(() => authService.verifyAccessToken("invalid-token")).toThrow(
        "Invalid or expired token"
      );
    });
  });

  describe("token extraction", () => {
    it("should extract token from a valid Bearer header", () => {
      const token = "my-jwt-token";
      const header = `Bearer ${token}`;
      expect(authService.extractTokenFromHeader(header)).toBe(token);
    });

    it("should return null for a malformed header", () => {
      expect(
        authService.extractTokenFromHeader("Bear my-jwt-token")
      ).toBeNull();
    });

    it("should return null for a missing header", () => {
      expect(authService.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh the access token successfully", async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockUser);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should throw an error if user is not found", async () => {
      const refreshToken = authService.generateRefreshTokenInstance(mockUser);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        authService.refreshAccessToken(refreshToken)
      ).rejects.toThrow("Invalid refresh token");
    });
  });
});
