/**
 * PerformanceOptimizer Test Suite
 * Phase 1: Foundation Strengthening - Coverage Enhancement
 * Generated for 80% coverage target
 */

import { PerformanceOptimizer } from "../services/performance-optimizer";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock dependencies
jest.mock("@azure/functions");
jest.mock("applicationinsights");

describe("PerformanceOptimizer", () => {
  let optimizer: PerformanceOptimizer;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = PerformanceOptimizer.getInstance();
    mockContext = {
      log: jest.fn(),
      executionContext: {
        functionName: "TestFunction",
        invocationId: "test-invocation-id",
      },
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Core Functionality", () => {
    it("should initialize correctly", () => {
      expect(optimizer).toBeDefined();
      expect(optimizer.getPerformanceStats).toBeDefined();
    });

    it("should handle standard operations", async () => {
      const mockHandler = jest.fn().mockResolvedValue("test result");

      const result = await optimizer.optimizeExecution(
        mockContext,
        "TestFunction",
        mockHandler
      );

      expect(result).toBe("test result");
      expect(mockHandler).toHaveBeenCalled();
    });

    it("should track cold start events", async () => {
      const mockHandler = jest.fn().mockResolvedValue("test result");

      await optimizer.optimizeExecution(
        mockContext,
        "TestFunction",
        mockHandler
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining("Optimizing execution")
      );
    });
  });

  describe("Caching", () => {
    it("should cache function results", async () => {
      const mockHandler = jest.fn().mockResolvedValue("cached result");

      // First call
      const result1 = await optimizer.withCache("test-key", mockHandler, 1000);

      // Second call should use cache
      const result2 = await optimizer.withCache("test-key", mockHandler, 1000);

      expect(result1).toBe("cached result");
      expect(result2).toBe("cached result");
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it("should expire cached entries", async () => {
      const mockHandler = jest
        .fn()
        .mockResolvedValueOnce("first result")
        .mockResolvedValueOnce("second result");

      // First call
      await optimizer.withCache("test-key", mockHandler, 1);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should fetch new data
      const result = await optimizer.withCache("test-key", mockHandler, 1);

      expect(result).toBe("second result");
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Test error"));

      await expect(
        optimizer.optimizeExecution(mockContext, "TestFunction", mockHandler)
      ).rejects.toThrow("Test error");
    });

    it("should track error events", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Test error"));

      try {
        await optimizer.optimizeExecution(
          mockContext,
          "TestFunction",
          mockHandler
        );
      } catch (error) {
        // Expected error
      }

      // Verify error was logged
      expect(mockContext.log).toHaveBeenCalled();
    });
  });

  describe("Performance Metrics", () => {
    it("should collect performance statistics", () => {
      const stats = optimizer.getPerformanceStats();

      expect(stats).toHaveProperty("isWarm");
      expect(stats).toHaveProperty("cacheSize");
      expect(stats).toHaveProperty("connectionPoolSize");
      expect(stats).toHaveProperty("uptime");
      expect(stats).toHaveProperty("memoryUsage");
      expect(stats).toHaveProperty("config");
    });

    it("should create optimized HTTP responses", () => {
      const testData = { message: "test data" };
      const response = optimizer.createOptimizedResponse(testData, 200);

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty(
        "Content-Type",
        "application/json"
      );
      expect(response.headers).toHaveProperty("Cache-Control");
      expect(JSON.parse(response.body)).toHaveProperty("success", true);
      expect(JSON.parse(response.body)).toHaveProperty("data", testData);
    });
  });

  describe("Connection Management", () => {
    it("should manage connection pooling when enabled", () => {
      const optimizerWithPooling = new PerformanceOptimizer({
        enableConnectionPooling: true,
      });

      expect(() => {
        optimizerWithPooling.getConnection("cosmosdb");
      }).not.toThrow();
    });

    it("should throw error when connection pooling disabled", () => {
      const optimizerWithoutPooling = new PerformanceOptimizer({
        enableConnectionPooling: false,
      });

      expect(() => {
        optimizerWithoutPooling.getConnection("cosmosdb");
      }).toThrow("Connection pooling is disabled");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources properly", async () => {
      await expect(optimizer.cleanup()).resolves.not.toThrow();
    });
  });
});
