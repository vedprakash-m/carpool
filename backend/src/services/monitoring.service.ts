/**
 * Comprehensive Monitoring Service
 * Phase 1: Foundation Strengthening - Monitoring & Observability
 *
 * Features:
 * - Application Insights integration
 * - Health check endpoints
 * - Structured logging with correlation IDs
 * - Performance metrics collection
 * - Alert configuration
 */

import * as ApplicationInsights from "applicationinsights";
import { Context } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  duration: number;
  checks: Record<
    string,
    {
      status: "pass" | "fail" | "warn";
      time: number;
      output?: string;
    }
  >;
  version: string;
  uptime: number;
}

interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  correlationId: string;
  userId?: string;
  functionName?: string;
  data?: any;
  error?: {
    message: string;
    stack: string;
    code?: string;
  };
}

interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
}

class MonitoringService {
  private static instance: MonitoringService;
  private correlationId: string = uuidv4();
  private startTime: number = Date.now();
  private healthChecks: Map<string, () => Promise<any>> = new Map();
  private alerts: AlertConfig[] = [];

  constructor() {
    this.initializeApplicationInsights();
    this.registerDefaultHealthChecks();
    this.configureDefaultAlerts();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialize Application Insights with comprehensive telemetry
   */
  private initializeApplicationInsights(): void {
    if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      console.warn("⚠️ Application Insights connection string not configured");
      return;
    }

    try {
      ApplicationInsights.setup()
        .setAutoCollectConsole(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectRequests(true)
        .setAutoCollectDependencies(true)
        .setAutoDependencyCorrelation(true)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(true)
        .setInternalLogging(false, true)
        .start();

      // Configure custom telemetry
      ApplicationInsights.defaultClient.config.maxBatchSize = 250;
      ApplicationInsights.defaultClient.config.maxBatchIntervalMs = 15000;

      // Add custom telemetry initializer
      ApplicationInsights.defaultClient.addTelemetryProcessor(
        (envelope, context) => {
          envelope.tags["ai.cloud.role"] = "vcarpool-backend";
          envelope.tags["ai.cloud.roleInstance"] =
            process.env.WEBSITE_INSTANCE_ID || "local";

          if (envelope.data.baseData) {
            envelope.data.baseData.properties = {
              ...envelope.data.baseData.properties,
              correlationId: this.correlationId,
              version: process.env.APP_VERSION || "1.0.0",
            };
          }

          return true;
        }
      );

      this.log("info", "Application Insights initialized successfully", {
        version: ApplicationInsights.defaultClient.config.endpointUrl,
      });
    } catch (error) {
      console.error("❌ Failed to initialize Application Insights:", error);
    }
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(id?: string): string {
    this.correlationId = id || uuidv4();
    return this.correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Structured logging with correlation tracking
   */
  log(
    level: LogEntry["level"],
    message: string,
    data?: any,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      data,
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack || "",
        code: (error as any).code,
      };
    }

    // Console output for local development
    const formattedMessage = `[${
      logEntry.timestamp
    }] [${level.toUpperCase()}] [${this.correlationId}] ${message}`;

    switch (level) {
      case "debug":
        console.debug(formattedMessage, data);
        break;
      case "info":
        console.info(formattedMessage, data);
        break;
      case "warn":
        console.warn(formattedMessage, data, error);
        break;
      case "error":
        console.error(formattedMessage, data, error);
        break;
    }

    // Send to Application Insights
    if (ApplicationInsights.defaultClient) {
      if (level === "error" && error) {
        ApplicationInsights.defaultClient.trackException({
          exception: error,
          properties: {
            correlationId: this.correlationId,
            level,
            ...data,
          },
        });
      } else {
        ApplicationInsights.defaultClient.trackTrace({
          message: `${message}${
            data ? ` | Data: ${JSON.stringify(data)}` : ""
          }`,
          severity: this.mapLogLevelToSeverity(level),
          properties: {
            correlationId: this.correlationId,
            level,
            ...data,
          },
        });
      }
    }
  }

  /**
   * Track custom events
   */
  trackEvent(
    name: string,
    properties?: Record<string, any>,
    measurements?: Record<string, number>
  ): void {
    if (ApplicationInsights.defaultClient) {
      ApplicationInsights.defaultClient.trackEvent({
        name,
        properties: {
          correlationId: this.correlationId,
          timestamp: new Date().toISOString(),
          ...properties,
        },
        measurements,
      });
    }

    this.log("info", `Event tracked: ${name}`, { properties, measurements });
  }

  /**
   * Track custom metrics
   */
  trackMetric(
    name: string,
    value: number,
    properties?: Record<string, any>
  ): void {
    if (ApplicationInsights.defaultClient) {
      ApplicationInsights.defaultClient.trackMetric({
        name,
        value,
        properties: {
          correlationId: this.correlationId,
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });
    }

    this.log("debug", `Metric tracked: ${name} = ${value}`, properties);
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    name: string,
    duration: number,
    success: boolean,
    properties?: Record<string, any>
  ): void {
    this.trackEvent(
      "Performance",
      {
        operationName: name,
        duration,
        success,
        ...properties,
      },
      {
        duration,
        success: success ? 1 : 0,
      }
    );

    // Alert on slow operations
    if (duration > 5000) {
      // 5 seconds
      this.trackEvent("Performance.SlowOperation", {
        operationName: name,
        duration,
        threshold: 5000,
      });
    }
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name: string, checkFunction: () => Promise<any>): void {
    this.healthChecks.set(name, checkFunction);
    this.log("info", `Health check registered: ${name}`);
  }

  /**
   * Register default health checks
   */
  private registerDefaultHealthChecks(): void {
    // System health check
    this.registerHealthCheck("system", async () => {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      return {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        uptime: uptime,
        nodeVersion: process.version,
        platform: process.platform,
      };
    });

    // Database health check
    this.registerHealthCheck("database", async () => {
      if (!process.env.COSMOS_DB_CONNECTION_STRING) {
        throw new Error("Database connection string not configured");
      }

      try {
        const { CosmosClient } = await import("@azure/cosmos");
        const client = new CosmosClient(
          process.env.COSMOS_DB_CONNECTION_STRING
        );
        const { database } = await client.databases.createIfNotExists({
          id: process.env.COSMOS_DB_DATABASE_ID || "vcarpool",
        });

        return {
          status: "connected",
          databaseId: database.id,
        };
      } catch (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }
    });

    // Application Insights health check
    this.registerHealthCheck("telemetry", async () => {
      return {
        configured: !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        client: !!ApplicationInsights.defaultClient,
        status: ApplicationInsights.defaultClient ? "active" : "inactive",
      };
    });
  }

  /**
   * Execute all health checks
   */
  async executeHealthChecks(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks: HealthCheckResult["checks"] = {};
    let overallStatus: HealthCheckResult["status"] = "healthy";

    for (const [name, checkFunction] of this.healthChecks.entries()) {
      const checkStart = Date.now();

      try {
        const result = await Promise.race([
          checkFunction(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Health check timeout")), 10000)
          ),
        ]);

        checks[name] = {
          status: "pass",
          time: Date.now() - checkStart,
          output: JSON.stringify(result),
        };
      } catch (error) {
        checks[name] = {
          status: "fail",
          time: Date.now() - checkStart,
          output: error.message,
        };

        overallStatus = overallStatus === "healthy" ? "degraded" : "unhealthy";
      }
    }

    // Determine overall status
    const failedChecks = Object.values(checks).filter(
      (c) => c.status === "fail"
    ).length;
    if (failedChecks > 0) {
      overallStatus =
        failedChecks >= this.healthChecks.size / 2 ? "unhealthy" : "degraded";
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
      version: process.env.APP_VERSION || "1.0.0",
      uptime: Date.now() - this.startTime,
    };

    // Track health check result
    this.trackEvent("HealthCheck.Executed", {
      status: overallStatus,
      duration: result.duration,
      checksCount: this.healthChecks.size,
      failedCount: failedChecks,
    });

    this.log("info", `Health check completed: ${overallStatus}`, {
      duration: result.duration,
      checksCount: this.healthChecks.size,
      failedCount: failedChecks,
    });

    return result;
  }

  /**
   * Configure default alerts
   */
  private configureDefaultAlerts(): void {
    this.alerts = [
      {
        name: "High Error Rate",
        condition: "exceptions/count > 10",
        threshold: 10,
        severity: "high",
        enabled: true,
      },
      {
        name: "Slow Response Time",
        condition: "requests/duration > 5000",
        threshold: 5000,
        severity: "medium",
        enabled: true,
      },
      {
        name: "High Memory Usage",
        condition: "memory/usage > 80%",
        threshold: 80,
        severity: "medium",
        enabled: true,
      },
      {
        name: "Database Connection Failures",
        condition: "database/failures > 5",
        threshold: 5,
        severity: "high",
        enabled: true,
      },
    ];
  }

  /**
   * Create middleware for function monitoring
   */
  static middleware(functionName?: string) {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) => {
      const method = descriptor.value;
      const monitor = MonitoringService.getInstance();

      descriptor.value = async function (context: Context, ...args: any[]) {
        const operationName =
          functionName || `${target.constructor.name}.${propertyName}`;
        const startTime = Date.now();

        // Set correlation ID from context or generate new one
        const correlationId =
          context.executionContext.invocationId || monitor.setCorrelationId();

        monitor.log("info", `Function started: ${operationName}`, {
          functionName: operationName,
          invocationId: context.executionContext.invocationId,
          args: args.length,
        });

        try {
          const result = await method.apply(this, [context, ...args]);
          const duration = Date.now() - startTime;

          monitor.trackPerformance(operationName, duration, true, {
            functionName: operationName,
          });

          monitor.log("info", `Function completed: ${operationName}`, {
            duration,
            success: true,
          });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;

          monitor.trackPerformance(operationName, duration, false, {
            functionName: operationName,
            error: error.message,
          });

          monitor.log(
            "error",
            `Function failed: ${operationName}`,
            {
              duration,
              success: false,
            },
            error
          );

          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Map log level to Application Insights severity
   */
  private mapLogLevelToSeverity(
    level: LogEntry["level"]
  ): ApplicationInsights.Contracts.SeverityLevel {
    switch (level) {
      case "debug":
        return ApplicationInsights.Contracts.SeverityLevel.Verbose;
      case "info":
        return ApplicationInsights.Contracts.SeverityLevel.Information;
      case "warn":
        return ApplicationInsights.Contracts.SeverityLevel.Warning;
      case "error":
        return ApplicationInsights.Contracts.SeverityLevel.Error;
      default:
        return ApplicationInsights.Contracts.SeverityLevel.Information;
    }
  }

  /**
   * Flush all telemetry data
   */
  async flush(): Promise<void> {
    if (ApplicationInsights.defaultClient) {
      return new Promise((resolve) => {
        ApplicationInsights.defaultClient.flush({
          callback: () => resolve(),
        });
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): any {
    return {
      correlationId: this.correlationId,
      uptime: Date.now() - this.startTime,
      healthChecksCount: this.healthChecks.size,
      alertsCount: this.alerts.length,
      applicationInsightsConfigured: !!ApplicationInsights.defaultClient,
    };
  }
}

export { MonitoringService, HealthCheckResult, LogEntry, AlertConfig };
