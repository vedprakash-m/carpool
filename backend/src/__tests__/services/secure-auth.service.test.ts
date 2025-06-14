/**
 * Secure Authentication Service Tests
 * Comprehensive tests for the secure authentication service with enhanced security measures
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Create type-safe mock functions
const createMockFn = <T extends (...args: any[]) => any>() => jest.fn<T>();

// Mock bcrypt
const mockBcrypt = {
  compare: createMockFn<(password: string, hash: string) => Promise<boolean>>(),
  hash: createMockFn<(password: string, rounds: number) => Promise<string>>(),
};

// Mock jsonwebtoken
const mockJwt = {
  sign: createMockFn<(payload: any, secret: string, options?: any) => string>(),
  verify: createMockFn<(token: string, secret: string) => any>(),
  TokenExpiredError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "TokenExpiredError";
    }
  },
  JsonWebTokenError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "JsonWebTokenError";
    }
  },
};

// Mock database service
const mockDatabaseService = {
  isAccountLocked: createMockFn<(email: string) => Promise<boolean>>(),
  getUserByEmail: createMockFn<(email: string) => Promise<any>>(),
  recordLoginAttempt: createMockFn<(email: string) => Promise<void>>(),
  clearLoginAttempts: createMockFn<(email: string) => Promise<void>>(),
  createUser: createMockFn<(userData: any) => Promise<any>>(),
  updateUser: createMockFn<(email: string, updates: any) => Promise<void>>(),
  getLoginAttempts: createMockFn<(email: string) => Promise<number>>(),
  healthCheck: createMockFn<() => Promise<any>>(),
};

// Mock config service
const mockConfigService = {
  getConfig: jest.fn().mockReturnValue({
    jwt: {
      secret: "test-secret",
      expiresIn: "1h",
    },
    auth: {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      jwtSecret: "test-secret",
      jwtExpiresIn: "1h",
      bcryptRounds: 10,
    },
    app: {
      environment: "test",
    },
  }),
  hasRealGeocoding: jest.fn().mockReturnValue(false),
};

// Setup module mocks
jest.mock("bcrypt", () => mockBcrypt);
jest.mock("jsonwebtoken", () => mockJwt);
jest.mock("../../services/database.service", () => ({
  databaseService: mockDatabaseService,
}));
jest.mock("../../services/config.service", () => ({
  configService: mockConfigService,
}));

describe("SecureAuthService", () => {
  let authService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamic import to avoid issues with mocking
    const { secureAuthService } = await import(
      "../../services/secure-auth.service"
    );
    authService = secureAuthService;
  });

  describe("Service Availability", () => {
    it("should be available for import", async () => {
      expect(authService).toBeDefined();
      expect(typeof authService.authenticate).toBe("function");
    });

    it("should have singleton behavior", async () => {
      const { secureAuthService: instance1 } = await import(
        "../../services/secure-auth.service"
      );
      const { secureAuthService: instance2 } = await import(
        "../../services/secure-auth.service"
      );
      expect(instance1).toBe(instance2);
    });
  });

  describe("Authentication", () => {
    const validUser = {
      id: "test-user-id",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "parent" as const,
      passwordHash: "hashed-password",
      isActive: true,
      phoneNumber: "+1234567890",
      address: "123 Test St",
      emergencyContacts: [],
      weeklyPreferences: {},
      onboardingProgress: {},
      lastLogin: new Date(),
    };

    it("should successfully authenticate valid user", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue("valid-jwt-token");

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "validPassword123",
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe("valid-jwt-token");
      expect(result.user?.passwordHash).toBeUndefined(); // Should not include password hash
    });

    it("should reject authentication for locked account", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(true);

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "validPassword123",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Account is locked");
      expect(result.lockoutTime).toBe(15);
    });

    it("should reject authentication for non-existent user", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(null);
      mockDatabaseService.getLoginAttempts.mockResolvedValue(3);

      const result = await authService.authenticate({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email or password");
      expect(mockDatabaseService.recordLoginAttempt).toHaveBeenCalled();
    });

    it("should reject authentication for inactive user", async () => {
      const inactiveUser = { ...validUser, isActive: false };
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(inactiveUser);
      mockDatabaseService.getLoginAttempts.mockResolvedValue(2);

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "validPassword123",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Account is deactivated. Please contact support."
      );
      expect(mockDatabaseService.recordLoginAttempt).toHaveBeenCalled();
    });

    it("should reject authentication for invalid password", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(false);
      mockDatabaseService.getLoginAttempts.mockResolvedValue(1);

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "wrongPassword",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid email or password");
      expect(mockDatabaseService.recordLoginAttempt).toHaveBeenCalled();
    });

    it("should normalize email addresses", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue("valid-jwt-token");

      await authService.authenticate({
        email: "  TEST@EXAMPLE.COM  ",
        password: "validPassword123",
      });

      expect(mockDatabaseService.getUserByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
    });
  });

  describe("User Registration", () => {
    const validRegistrationData = {
      email: "newuser@example.com",
      password: "SecurePass123",
      firstName: "New",
      lastName: "User",
      role: "parent" as const,
      phoneNumber: "+1234567890",
      address: "456 New St",
    };

    it("should successfully register new user", async () => {
      mockDatabaseService.getUserByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashed-password");
      mockDatabaseService.createUser.mockResolvedValue({
        id: "new-user-id",
        ...validRegistrationData,
        passwordHash: "hashed-password",
        isActive: true,
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      });
      mockJwt.sign.mockReturnValue("valid-jwt-token");

      const result = await authService.register(validRegistrationData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe("newuser@example.com");
      expect(result.user?.passwordHash).toBeUndefined(); // Should not include password hash
    });

    it("should reject registration for existing email", async () => {
      mockDatabaseService.getUserByEmail.mockResolvedValue({
        id: "existing-user",
        email: "newuser@example.com",
        firstName: "Existing",
        lastName: "User",
        role: "parent",
        passwordHash: "hash",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      });

      const result = await authService.register(validRegistrationData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("An account with this email already exists");
    });

    it("should validate password strength", async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: "weak",
      };

      const result = await authService.register(weakPasswordData);

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "Password must be at least 8 characters"
      );
    });

    it("should validate email format", async () => {
      const invalidEmailData = {
        ...validRegistrationData,
        email: "invalid-email",
      };

      const result = await authService.register(invalidEmailData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Please provide a valid email address");
    });
  });

  describe("Password Management", () => {
    it("should successfully change password", async () => {
      const user = {
        id: "user-id",
        email: "test@example.com",
        passwordHash: "old-hashed-password",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      };

      mockDatabaseService.getUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValueOnce(true); // Current password check
      mockBcrypt.compare.mockResolvedValueOnce(false); // New password different check
      mockBcrypt.hash.mockResolvedValue("new-hashed-password");

      const result = await authService.changePassword(
        "test@example.com",
        "oldPassword",
        "NewSecurePass123"
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("Password changed successfully");
    });

    it("should reject password change with invalid current password", async () => {
      const user = {
        id: "user-id",
        email: "test@example.com",
        passwordHash: "old-hashed-password",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      };

      mockDatabaseService.getUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await authService.changePassword(
        "test@example.com",
        "wrongPassword",
        "NewSecurePass123"
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Current password is incorrect");
    });

    it("should validate new password strength", async () => {
      const user = {
        id: "user-id",
        email: "test@example.com",
        passwordHash: "old-hashed-password",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      };

      mockDatabaseService.getUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await authService.changePassword(
        "test@example.com",
        "oldPassword",
        "weak"
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain(
        "Password must be at least 8 characters"
      );
    });
  });

  describe("Token Management", () => {
    it("should verify valid JWT token", async () => {
      const validPayload = {
        id: "user-id",
        email: "test@example.com",
        role: "parent",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const user = {
        id: "user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        isActive: true,
        passwordHash: "hash",
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      };

      mockJwt.verify.mockReturnValue(validPayload);
      mockDatabaseService.getUserByEmail.mockResolvedValue(user);

      const result = await authService.verifyToken("valid-jwt-token");

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.passwordHash).toBeUndefined();
    });

    it("should reject invalid JWT token", async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await authService.verifyToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Token verification failed");
    });

    it("should reject expired JWT token", async () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new mockJwt.TokenExpiredError("Token expired");
        throw error;
      });

      const result = await authService.verifyToken("expired-token");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Token has expired");
    });
  });

  describe("Service Health", () => {
    it("should report healthy status when all dependencies are available", async () => {
      mockDatabaseService.healthCheck.mockResolvedValue({ status: "healthy" });

      const health = await authService.getServiceStatus();

      expect(health.status).toBe("healthy");
      expect(health.timestamp).toBeDefined();
      expect(health.database).toBeDefined();
      expect(health.configuration).toBeDefined();
    });

    it("should report error status when database is unavailable", async () => {
      mockDatabaseService.healthCheck.mockRejectedValue(
        new Error("Database connection failed")
      );

      const health = await authService.getServiceStatus();

      expect(health.status).toBe("error");
      expect(health.message).toBe("Service health check failed");
    });
  });

  describe("JWT Token Operations", () => {
    it("should verify JWT token with verifyJwtToken method", () => {
      const validPayload = {
        id: "user-id",
        email: "test@example.com",
        role: "parent",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwt.verify.mockReturnValue(validPayload);

      const result = authService.verifyJwtToken("valid-jwt-token");

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(validPayload);
    });

    it("should handle invalid JWT token format", () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new mockJwt.JsonWebTokenError("Invalid token");
        throw error;
      });

      const result = authService.verifyJwtToken("invalid-token");

      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Invalid token format");
    });

    it("should handle expired JWT token", () => {
      mockJwt.verify.mockImplementation(() => {
        const error = new mockJwt.TokenExpiredError("Token expired");
        throw error;
      });

      const result = authService.verifyJwtToken("expired-token");

      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Token has expired");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully during authentication", async () => {
      mockDatabaseService.getUserByEmail.mockRejectedValue(
        new Error("Database error")
      );

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "An error occurred during authentication. Please try again."
      );
    });

    it("should handle database errors gracefully during registration", async () => {
      mockDatabaseService.getUserByEmail.mockRejectedValue(
        new Error("Database error")
      );

      const result = await authService.register({
        email: "test@example.com",
        password: "SecurePass123",
        firstName: "Test",
        lastName: "User",
        role: "parent",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "An error occurred during registration. Please try again."
      );
    });

    it("should handle bcrypt errors gracefully", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue({
        id: "test-user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        passwordHash: "hashed-password",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      });
      mockBcrypt.compare.mockRejectedValue(new Error("Bcrypt error"));

      const result = await authService.authenticate({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "An error occurred during authentication. Please try again."
      );
    });
  });

  describe("Security Features", () => {
    it("should not expose sensitive information in responses", async () => {
      mockDatabaseService.isAccountLocked.mockResolvedValue(false);
      mockDatabaseService.getUserByEmail.mockResolvedValue(null);

      const result = await authService.authenticate({
        email: "nonexistent@example.com",
        password: "password123",
      });

      // Should not reveal whether the email exists or not
      expect(result.message).toBe("Invalid email or password");
      expect(result.message).not.toContain("not found");
      expect(result.message).not.toContain("does not exist");
    });

    it("should prevent same password during password change", async () => {
      const user = {
        id: "user-id",
        email: "test@example.com",
        passwordHash: "current-hashed-password",
        firstName: "Test",
        lastName: "User",
        role: "parent",
        isActive: true,
        phoneNumber: "",
        address: "",
        emergencyContacts: [],
        weeklyPreferences: {},
        onboardingProgress: {},
        lastLogin: new Date(),
      };

      mockDatabaseService.getUserByEmail.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValueOnce(true); // Current password check
      mockBcrypt.compare.mockResolvedValueOnce(true); // Same password check

      const result = await authService.changePassword(
        "test@example.com",
        "currentPassword123",
        "currentPassword123"
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "New password must be different from your current password"
      );
    });

    it("should handle common weak passwords", async () => {
      const result = await authService.register({
        email: "weakpassword@example.com", // Use unique email
        password: "Password123", // Valid format but common word
        firstName: "Test",
        lastName: "User",
        role: "parent",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Please choose a stronger, less common password"
      );
    });
  });
});
