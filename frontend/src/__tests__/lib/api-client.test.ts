/**
 * Tests for ApiClient
 * Testing core functionality: authentication, API responses, and business logic
 * Aligned with VCarpool functional requirements
 */

import { ApiClient } from "../../lib/api-client";

// Mock axios module completely
jest.mock("axios", () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { baseURL: "http://test-api.com" },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockAxios = {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  return mockAxios;
});

describe("ApiClient - VCarpool Functional Tests", () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    jest.clearAllMocks();
    apiClient = new ApiClient("http://test-api.com");
  });

  describe("Authentication System Requirements", () => {
    it("should handle user login with proper response format", async () => {
      const credentials = {
        email: "admin@vcarpool.com",
        password: "Admin123!",
      };

      const result = await apiClient.post("/v1/auth/token", credentials);

      // VCarpool Auth Response Requirements
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("user");
      expect(result.data).toHaveProperty("token");
      expect(result.data).toHaveProperty("refreshToken");

      const user = (result.data as any).user;
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(["admin", "parent", "student"]).toContain(user.role);
    });

    it("should handle user registration with complete user profile", async () => {
      const userData = {
        email: "parent@example.com",
        firstName: "John",
        lastName: "Parent",
        password: "SecurePass123!",
        role: "parent",
      };

      const result = await apiClient.post("/v1/auth/register", userData);

      expect(result.success).toBe(true);
      expect((result.data as any).user.email).toBe(userData.email);
      expect((result.data as any).user.firstName).toBe(userData.firstName);
      expect((result.data as any).user.lastName).toBe(userData.lastName);
      expect((result.data as any).user.role).toBe(userData.role);
      expect((result.data as any).token).toBeDefined();
    });

    it("should manage JWT tokens according to VCarpool security requirements", () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
      const refreshToken = "refresh_token_example";

      apiClient.setToken(token, refreshToken);

      expect(localStorage.setItem).toHaveBeenCalledWith("access_token", token);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "refresh_token",
        refreshToken
      );

      apiClient.clearToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("refresh_token");
    });
  });

  describe("Trip Management API Requirements", () => {
    it("should fetch trip statistics for school carpool analytics", async () => {
      const result = await apiClient.get("/v1/trips/stats");

      expect(result.success).toBe(true);
      const stats = result.data as any;

      // VCarpool Trip Statistics Requirements
      expect(stats).toHaveProperty("totalTrips");
      expect(stats).toHaveProperty("tripsAsDriver");
      expect(stats).toHaveProperty("tripsAsPassenger");
      expect(stats).toHaveProperty("costSavings");
      expect(stats).toHaveProperty("upcomingTrips");

      // Verify numeric values
      expect(typeof stats.totalTrips).toBe("number");
      expect(typeof stats.costSavings).toBe("number");
    });

    it("should fetch trip list with pagination support", async () => {
      const result = await apiClient.get("/v1/trips");

      expect(result.success).toBe(true);
      const tripList = result.data as any;

      expect(tripList).toHaveProperty("data");
      expect(Array.isArray(tripList.data)).toBe(true);

      if (tripList.data.length > 0) {
        const trip = tripList.data[0];
        expect(trip).toHaveProperty("id");
        expect(trip).toHaveProperty("fromLocation");
        expect(trip).toHaveProperty("toLocation");
      }
    });
  });

  describe("User Management API Requirements", () => {
    it("should fetch current user profile", async () => {
      const result = await apiClient.get("/v1/users/me");

      expect(result.success).toBe(true);
      const user = result.data as any;

      // VCarpool User Profile Requirements
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
      expect(user).toHaveProperty("role");

      // Role validation for school carpool system
      expect(["admin", "parent", "student"]).toContain(user.role);
    });

    it("should handle admin user creation requests", async () => {
      const newUser = {
        email: "newparent@school.edu",
        firstName: "Jane",
        lastName: "Smith",
        role: "parent",
        password: "TempPass123!",
      };

      const result = await apiClient.post("/v1/admin/users", newUser);

      expect(result.success).toBe(true);
      // Admin endpoints should return success for valid data
    });
  });

  describe("School Scheduling API Requirements", () => {
    it("should handle weekly preference submission", async () => {
      const preferences = {
        weekStartDate: "2024-01-15",
        preferences: [
          { day: "monday", timeSlot: "morning", preference: "preferable" },
          {
            day: "tuesday",
            timeSlot: "afternoon",
            preference: "less-preferable",
          },
          { day: "wednesday", timeSlot: "morning", preference: "unavailable" },
        ],
      };

      const result = await apiClient.post(
        "/v1/parents/weekly-preferences",
        preferences
      );

      expect(result.success).toBe(true);
    });

    it("should handle schedule generation requests", async () => {
      const scheduleRequest = {
        weekStartDate: "2024-01-15",
        forceRegenerate: false,
      };

      const result = await apiClient.post(
        "/v1/admin/generate-schedule",
        scheduleRequest
      );

      expect(result.success).toBe(true);
    });
  });

  describe("API Response Format Consistency", () => {
    it("should return consistent ApiResponse format for all endpoints", async () => {
      const endpoints = ["/v1/trips/stats", "/v1/users/me", "/v1/trips"];

      for (const endpoint of endpoints) {
        const result = await apiClient.get(endpoint);

        // VCarpool API Standard Response Format
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("data");
        expect(typeof result.success).toBe("boolean");
      }
    });

    it("should handle error responses with proper format", async () => {
      // Test that error handling works (even in mock mode)
      const result = await apiClient.get("/v1/nonexistent");

      // Should return success: true with empty data for unknown endpoints in mock mode
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("data");
    });
  });

  describe("Mock Mode for Development", () => {
    it("should enable and disable mock mode for testing", () => {
      // VCarpool supports mock mode for development and testing
      apiClient.enableMockMode();
      expect(localStorage.setItem).toHaveBeenCalledWith("MOCK_AUTH", "true");

      apiClient.disableMockMode();
      expect(localStorage.removeItem).toHaveBeenCalledWith("MOCK_AUTH");
    });

    it("should provide realistic mock data for school carpool scenarios", async () => {
      // Ensure mock mode is enabled
      apiClient.enableMockMode();

      const statsResult = await apiClient.get("/v1/trips/stats");
      expect(statsResult.success).toBe(true);

      const userResult = await apiClient.get("/v1/users/me");
      expect(userResult.success).toBe(true);

      // Mock data should be consistent with VCarpool use cases
      const user = userResult.data as any;
      expect(user.email).toContain("@");
    });
  });

  describe("Network Delay Simulation", () => {
    it("should simulate realistic network delays for auth operations", async () => {
      const startTime = Date.now();
      await apiClient.post("/v1/auth/token", {
        email: "test",
        password: "test",
      });
      const endTime = Date.now();

      // Should take at least 500ms to simulate real network conditions
      expect(endTime - startTime).toBeGreaterThanOrEqual(490); // Allow for small timing variations
    });
  });

  describe("HTTP Method Support", () => {
    it("should support all required HTTP methods", () => {
      // VCarpool API requires GET, POST, PUT, DELETE support
      expect(typeof apiClient.get).toBe("function");
      expect(typeof apiClient.post).toBe("function");
      expect(typeof apiClient.put).toBe("function");
      expect(typeof apiClient.delete).toBe("function");
      expect(typeof apiClient.getPaginated).toBe("function");
    });

    it("should handle POST requests for data submission", async () => {
      const testData = { key: "value" };
      const result = await apiClient.post("/v1/test", testData);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("data");
    });
  });

  describe("Token Management Lifecycle", () => {
    it("should load tokens from localStorage on initialization", () => {
      const mockGetItem = localStorage.getItem as jest.Mock;
      mockGetItem.mockImplementation((key: string) => {
        if (key === "access_token") return "stored-access-token";
        if (key === "refresh_token") return "stored-refresh-token";
        return null;
      });

      apiClient.loadToken();

      // Verify internal state (using bracket notation for private access)
      expect(apiClient["token"]).toBe("stored-access-token");
      expect(apiClient["refreshToken"]).toBe("stored-refresh-token");
    });
  });
});
