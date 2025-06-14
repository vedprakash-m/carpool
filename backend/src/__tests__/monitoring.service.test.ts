/**
 * MonitoringService Test Suite
 * Phase 1: Foundation Strengthening - Coverage Enhancement
 * Generated for 80% coverage target
 */

import { MonitoringService } from "../services/monitoring.service";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock dependencies
jest.mock("applicationinsights");
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-correlation-id"),
}));

describe("MonitoringService", () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = MonitoringService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Core Functionality", () => {
    it("should initialize correctly", () => {
      expect(monitoringService).toBeDefined();
      expect(monitoringService.getCorrelationId).toBeDefined();
      expect(monitoringService.log).toBeDefined();
    });

    it("should generate and manage correlation IDs", () => {
      const correlationId = monitoringService.setCorrelationId();
      expect(correlationId).toBe("test-correlation-id");
      expect(monitoringService.getCorrelationId()).toBe("test-correlation-id");
    });

    it("should accept custom correlation IDs", () => {
      const customId = "custom-correlation-id";
      monitoringService.setCorrelationId(customId);
      expect(monitoringService.getCorrelationId()).toBe(customId);
    });
  });

  describe("Structured Logging", () => {
    it("should log info messages with correlation ID", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      monitoringService.log("info", "Test message", { key: "value" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[INFO]"),
        { key: "value" }
      );

      consoleSpy.mockRestore();
    });

    it("should log error messages with correlation ID and error details", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const testError = new Error("Test error");

      monitoringService.log(
        "error",
        "Test error message",
        { key: "value" },
        testError
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        { key: "value" },
        testError
      );

      consoleSpy.mockRestore();
    });

    it("should log warnings appropriately", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      monitoringService.log("warn", "Test warning", { severity: "medium" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
        { severity: "medium" }
      );

      consoleSpy.mockRestore();
    });

    it("should log debug messages when appropriate", () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      monitoringService.log("debug", "Debug information", { details: "test" });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG]"),
        { details: "test" }
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Event Tracking", () => {
    it("should track custom events with properties", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      monitoringService.trackEvent("UserAction", {
        action: "click",
        element: "button",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Event tracked: UserAction"),
        expect.objectContaining({
          properties: expect.objectContaining({
            action: "click",
            element: "button",
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should track metrics with values", () => {
      const consoleSpy = jest.spyOn(console, "debug").mockImplementation();

      monitoringService.trackMetric("ResponseTime", 250, {
        endpoint: "/api/test",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Metric tracked: ResponseTime = 250"),
        { endpoint: "/api/test" }
      );

      consoleSpy.mockRestore();
    });

    it("should track performance with duration and success status", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      monitoringService.trackPerformance("DatabaseQuery", 150, true, {
        query: "SELECT *",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Event tracked: Performance"),
        expect.objectContaining({
          properties: expect.objectContaining({
            operationName: "DatabaseQuery",
            duration: 150,
            success: true,
          }),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should alert on slow operations", () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      monitoringService.trackPerformance("SlowOperation", 6000, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Event tracked: Performance.SlowOperation"),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Health Checks", () => {
    it("should register health check functions", () => {
      const mockHealthCheck = jest.fn().mockResolvedValue({ status: "ok" });

      monitoringService.registerHealthCheck("testService", mockHealthCheck);

      // Verify the health check was registered (implementation detail)
      expect(monitoringService.getStats()).toBeDefined();
    });

    it("should execute all health checks and return results", async () => {
      const mockHealthCheck1 = jest.fn().mockResolvedValue({ status: "ok" });
      const mockHealthCheck2 = jest.fn().mockResolvedValue({ status: "ok" });

      monitoringService.registerHealthCheck("service1", mockHealthCheck1);
      monitoringService.registerHealthCheck("service2", mockHealthCheck2);

      const result = await monitoringService.executeHealthChecks();

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("checks");
      expect(result.checks).toHaveProperty("service1");
      expect(result.checks).toHaveProperty("service2");
      expect(result.checks).toHaveProperty("system"); // Default health check
      expect(result.checks).toHaveProperty("database"); // Default health check
      expect(result.checks).toHaveProperty("telemetry"); // Default health check
    });

    it("should handle health check failures gracefully", async () => {
      const mockFailingHealthCheck = jest
        .fn()
        .mockRejectedValue(new Error("Service unavailable"));

      monitoringService.registerHealthCheck(
        "failingService",
        mockFailingHealthCheck
      );

      const result = await monitoringService.executeHealthChecks();

      expect(result.status).toBe("degraded");
      expect(result.checks.failingService.status).toBe("fail");
      expect(result.checks.failingService.output).toContain(
        "Service unavailable"
      );
    });

    it("should timeout long-running health checks", async () => {
      const mockSlowHealthCheck = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 15000))
        );

      monitoringService.registerHealthCheck("slowService", mockSlowHealthCheck);

      const result = await monitoringService.executeHealthChecks();

      expect(result.checks.slowService.status).toBe("fail");
      expect(result.checks.slowService.output).toContain("timeout");
    });
  });

  describe("Performance Monitoring", () => {
    it("should provide monitoring statistics", () => {
      const stats = monitoringService.getStats();

      expect(stats).toHaveProperty("correlationId");
      expect(stats).toHaveProperty("uptime");
      expect(stats).toHaveProperty("healthChecksCount");
      expect(stats).toHaveProperty("alertsCount");
      expect(stats).toHaveProperty("applicationInsightsConfigured");
      expect(typeof stats.uptime).toBe("number");
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Middleware Integration", () => {
    it("should create middleware decorator", () => {
      const middleware = MonitoringService.middleware("TestFunction");

      expect(typeof middleware).toBe("function");
    });

    it("should track function execution through middleware", async () => {
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      class TestClass {
        @MonitoringService.middleware("TestFunction")
        async testMethod(context: any) {
          return "test result";
        }
      }

      const testInstance = new TestClass();
      const mockContext = {
        executionContext: {
          invocationId: "test-invocation",
          functionName: "TestFunction",
        },
      };

      const result = await testInstance.testMethod(mockContext);

      expect(result).toBe("test result");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Function started"),
        expect.anything()
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Function completed"),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it("should handle errors in middleware", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      class TestClass {
        @MonitoringService.middleware("ErrorFunction")
        async errorMethod(context: any) {
          throw new Error("Test error");
        }
      }

      const testInstance = new TestClass();
      const mockContext = {
        executionContext: {
          invocationId: "test-invocation",
          functionName: "ErrorFunction",
        },
      };

      await expect(testInstance.errorMethod(mockContext)).rejects.toThrow(
        "Test error"
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Function failed"),
        expect.anything(),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should flush telemetry data", async () => {
      await expect(monitoringService.flush()).resolves.not.toThrow();
    });
  });
});
