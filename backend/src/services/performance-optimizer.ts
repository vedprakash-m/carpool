/**
 * Performance Optimizer for Azure Functions
 * Phase 1: Foundation Strengthening - Performance Optimization
 *
 * Goals:
 * - Reduce cold start times to <1 second
 * - Implement connection pooling and caching
 * - Optimize bundle sizes
 * - Add performance monitoring
 */

import { Context } from "@azure/functions";
import * as ApplicationInsights from "applicationinsights";

interface PerformanceMetrics {
  coldStartTime?: number;
  executionTime: number;
  memoryUsage: number;
  connectionPoolSize: number;
  cacheHitRate: number;
}

interface OptimizationConfig {
  enableConnectionPooling: boolean;
  enableCaching: boolean;
  enableCompression: boolean;
  enableLazyLoading: boolean;
  maxConnectionPoolSize: number;
  cacheTimeoutMs: number;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private startTime: number;
  private isWarm = false;
  private connectionPool: Map<string, any> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.startTime = Date.now();
    this.config = {
      enableConnectionPooling: true,
      enableCaching: true,
      enableCompression: true,
      enableLazyLoading: true,
      maxConnectionPoolSize: 10,
      cacheTimeoutMs: 300000, // 5 minutes
      ...config,
    };

    this.initializePerformanceMonitoring();
  }

  static getInstance(
    config?: Partial<OptimizationConfig>
  ): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config);
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Initialize performance monitoring with Application Insights
   */
  private initializePerformanceMonitoring(): void {
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      ApplicationInsights.setup()
        .setAutoCollectConsole(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectPerformance(true)
        .setAutoCollectDependencies(true)
        .start();

      this.trackEvent("PerformanceOptimizer.Initialized", {
        timestamp: new Date().toISOString(),
        config: JSON.stringify(this.config),
      });
    }
  }

  /**
   * Optimize function execution with comprehensive performance enhancements
   */
  async optimizeExecution<T>(
    context: Context,
    functionName: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const executionStart = Date.now();
    const coldStart = !this.isWarm;

    if (coldStart) {
      this.trackColdStart();
      this.isWarm = true;
    }

    context.log(
      `⚡ Optimizing execution for ${functionName} (Cold start: ${coldStart})`
    );

    try {
      // Pre-execution optimizations
      await this.preExecutionOptimizations(context);

      // Execute the function
      const result = await handler();

      // Post-execution optimizations
      await this.postExecutionOptimizations(context, executionStart);

      return result;
    } catch (error) {
      this.trackError(functionName, error);
      throw error;
    }
  }

  /**
   * Pre-execution optimizations
   */
  private async preExecutionOptimizations(context: Context): Promise<void> {
    // Warm up connections if cold start
    if (!this.isWarm && this.config.enableConnectionPooling) {
      await this.warmUpConnections();
    }

    // Clear expired cache entries
    if (this.config.enableCaching) {
      this.clearExpiredCache();
    }

    // Memory optimization
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Post-execution optimizations
   */
  private async postExecutionOptimizations(
    context: Context,
    executionStart: number
  ): Promise<void> {
    const executionTime = Date.now() - executionStart;
    const memoryUsage = process.memoryUsage();

    // Track performance metrics
    this.trackPerformanceMetrics({
      executionTime,
      memoryUsage: memoryUsage.heapUsed,
      connectionPoolSize: this.connectionPool.size,
      cacheHitRate: this.calculateCacheHitRate(),
    });

    // Log performance data
    context.log(
      `📊 Execution time: ${executionTime}ms, Memory: ${Math.round(
        memoryUsage.heapUsed / 1024 / 1024
      )}MB`
    );
  }

  /**
   * Warm up database connections to reduce latency
   */
  private async warmUpConnections(): Promise<void> {
    if (!this.config.enableConnectionPooling) return;

    try {
      // Cosmos DB connection warmup
      if (
        process.env.COSMOS_DB_CONNECTION_STRING &&
        !this.connectionPool.has("cosmosdb")
      ) {
        const { CosmosClient } = await import("@azure/cosmos");
        const client = new CosmosClient(
          process.env.COSMOS_DB_CONNECTION_STRING
        );
        this.connectionPool.set("cosmosdb", client);
      }

      // Redis connection warmup (if used)
      if (
        process.env.REDIS_CONNECTION_STRING &&
        !this.connectionPool.has("redis")
      ) {
        const Redis = (await import("ioredis")).default;
        const redis = new Redis(process.env.REDIS_CONNECTION_STRING);
        this.connectionPool.set("redis", redis);
      }
    } catch (error) {
      console.warn("Connection warmup failed:", error);
    }
  }

  /**
   * Get cached data or execute function with caching
   */
  async withCache<T>(
    key: string,
    handler: () => Promise<T>,
    ttlMs: number = this.config.cacheTimeoutMs
  ): Promise<T> {
    if (!this.config.enableCaching) {
      return handler();
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.trackEvent("Cache.Hit", { key });
      return cached.data;
    }

    // Execute and cache result
    const result = await handler();
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl: ttlMs,
    });

    this.trackEvent("Cache.Set", { key, ttl: ttlMs });
    return result;
  }

  /**
   * Get optimized database connection
   */
  getConnection(type: "cosmosdb" | "redis"): any {
    if (!this.config.enableConnectionPooling) {
      throw new Error("Connection pooling is disabled");
    }

    return this.connectionPool.get(type);
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      this.trackEvent("Cache.Cleanup", { clearedCount });
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // Simplified calculation - would need more sophisticated tracking in production
    return this.cache.size > 0 ? 0.75 : 0; // Placeholder
  }

  /**
   * Track cold start event
   */
  private trackColdStart(): void {
    const coldStartTime = Date.now() - this.startTime;
    this.trackEvent("Function.ColdStart", {
      coldStartTime,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track performance metrics
   */
  private trackPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.trackEvent("Performance.Metrics", {
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    // Alert if performance thresholds are exceeded
    if (metrics.executionTime > 5000) {
      // 5 seconds
      this.trackEvent("Performance.SlowExecution", {
        executionTime: metrics.executionTime,
        threshold: 5000,
      });
    }

    if (metrics.memoryUsage > 512 * 1024 * 1024) {
      // 512 MB
      this.trackEvent("Performance.HighMemoryUsage", {
        memoryUsage: metrics.memoryUsage,
        threshold: 512 * 1024 * 1024,
      });
    }
  }

  /**
   * Track error events
   */
  private trackError(functionName: string, error: any): void {
    this.trackEvent("Function.Error", {
      functionName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track custom events
   */
  private trackEvent(eventName: string, properties: Record<string, any>): void {
    if (ApplicationInsights.defaultClient) {
      ApplicationInsights.defaultClient.trackEvent({
        name: eventName,
        properties,
      });
    }
  }

  /**
   * Create optimized HTTP response
   */
  createOptimizedResponse(data: any, statusCode = 200): any {
    const response = {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 minutes cache
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      },
      body: JSON.stringify({
        success: statusCode < 400,
        data: statusCode < 400 ? data : undefined,
        error: statusCode >= 400 ? data : undefined,
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || "1.0.0",
      }),
    };

    // Add compression hint if enabled
    if (this.config.enableCompression) {
      response.headers["Content-Encoding"] = "gzip";
    }

    return response;
  }

  /**
   * Middleware for automatic optimization
   */
  static middleware() {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) => {
      const method = descriptor.value;

      descriptor.value = async function (context: Context, ...args: any[]) {
        const optimizer = PerformanceOptimizer.getInstance();

        return optimizer.optimizeExecution(
          context,
          `${target.constructor.name}.${propertyName}`,
          () => method.apply(this, [context, ...args])
        );
      };

      return descriptor;
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Close all connections
    for (const [type, connection] of this.connectionPool.entries()) {
      try {
        if (connection && typeof connection.close === "function") {
          await connection.close();
        }
      } catch (error) {
        console.warn(`Failed to close ${type} connection:`, error);
      }
    }

    // Clear cache
    this.cache.clear();

    // Flush telemetry
    if (ApplicationInsights.defaultClient) {
      ApplicationInsights.defaultClient.flush();
    }
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): any {
    return {
      isWarm: this.isWarm,
      cacheSize: this.cache.size,
      connectionPoolSize: this.connectionPool.size,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      config: this.config,
    };
  }
}

export { PerformanceOptimizer, PerformanceMetrics, OptimizationConfig };
