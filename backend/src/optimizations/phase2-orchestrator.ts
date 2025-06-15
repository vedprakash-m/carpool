/**
 * Phase 2 Performance Orchestrator
 * Central coordination of all optimization components with in-memory caching only
 */

import { Container, SqlQuerySpec } from "@azure/cosmos";
import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { DatabaseQueryOptimizer } from "../utils/database-optimizer";
import { performanceOptimization } from "../utils/api-optimizer";
import { globalCache } from "../utils/cache";
import { logger } from "../utils/logger";

export interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  databaseQueries: number;
  optimizationEffectiveness: number;
  memoryUsage: number;
  lastUpdated: Date;
}

export interface OptimizationRecommendation {
  component: string;
  action: string;
  impact: "low" | "medium" | "high";
  description: string;
  implementation?: string;
}

export interface Phase2Config {
  enableDatabaseOptimization: boolean;
  enableAPIOptimization: boolean;
  enableCaching: boolean;
  enableMetrics: boolean;
  cacheConfig: {
    maxSize: number;
    defaultTtl: number;
    cleanupInterval: number;
  };
  performanceThresholds: {
    slowQueryMs: number;
    highRuThreshold: number;
    slowResponseMs: number;
  };
}

const defaultConfig: Phase2Config = {
  enableDatabaseOptimization: true,
  enableAPIOptimization: true,
  enableCaching: true,
  enableMetrics: true,
  cacheConfig: {
    maxSize: 10000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    cleanupInterval: 30 * 1000, // 30 seconds
  },
  performanceThresholds: {
    slowQueryMs: 1000,
    highRuThreshold: 10,
    slowResponseMs: 2000,
  },
};

/**
 * Phase 2 Performance Orchestrator
 * Coordinates all optimization components
 */
export class Phase2PerformanceOrchestrator {
  private config: Phase2Config;
  private metrics: PerformanceMetrics;
  private startTime: Date;
  private initialized: boolean = false;

  constructor(config?: Partial<Phase2Config>) {
    this.config = { ...defaultConfig, ...config };
    this.startTime = new Date();
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      databaseQueries: 0,
      optimizationEffectiveness: 0,
      memoryUsage: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Phase 2 Performance Orchestrator", {
        config: this.config,
      });

      // Initialize cache cleanup
      this.setupCacheCleanup();

      // Initialize performance monitoring
      this.setupPerformanceMonitoring();

      this.initialized = true;
      logger.info("Phase 2 Performance Orchestrator initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Phase 2 Performance Orchestrator", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize database operations
   */
  async optimizeDatabaseOperations<T>(
    container: Container,
    querySpec: SqlQuerySpec,
    partitionKey?: string
  ): Promise<T[]> {
    if (!this.config.enableDatabaseOptimization) {
      logger.debug("Database optimization disabled");
      return [];
    }

    const startTime = Date.now();

    try {
      const results = await DatabaseQueryOptimizer.executeQuery<T>(
        container,
        querySpec,
        partitionKey,
        {
          enableCaching: this.config.enableCaching,
          cacheTtl: this.config.cacheConfig.defaultTtl,
        }
      );

      const duration = Date.now() - startTime;
      this.updateMetrics("database", duration);

      logger.debug("Database operation optimized", {
        query: querySpec.query.substring(0, 100),
        duration,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("Database optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize API response
   */
  async optimizeAPIResponse(
    request: HttpRequest,
    handler: (req: HttpRequest) => Promise<HttpResponseInit>,
    options?: {
      enableCompression?: boolean;
      enableCaching?: boolean;
      enableDeduplication?: boolean;
    }
  ): Promise<HttpResponseInit> {
    if (!this.config.enableAPIOptimization) {
      logger.debug("API optimization disabled");
      return handler(request);
    }

    const startTime = Date.now();

    try {
      const optimizedHandler = performanceOptimization({
        enableCompression: options?.enableCompression ?? true,
        enableCaching: options?.enableCaching ?? this.config.enableCaching,
        enableDeduplication: options?.enableDeduplication ?? true,
        enableMetrics: this.config.enableMetrics,
      });

      const wrappedHandler = optimizedHandler(handler);
      const response = await wrappedHandler(request);

      const duration = Date.now() - startTime;
      this.updateMetrics("api", duration);

      return response;
    } catch (error) {
      logger.error("API optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check cache hit rate
    if (this.metrics.cacheHitRate < 0.7) {
      recommendations.push({
        component: "Cache",
        action: "Increase cache TTL",
        impact: "medium",
        description: `Cache hit rate is ${(this.metrics.cacheHitRate * 100).toFixed(1)}%. Consider increasing TTL or cache size.`,
        implementation: "Adjust cacheConfig.defaultTtl in configuration",
      });
    }

    // Check average response time
    if (this.metrics.averageResponseTime > this.config.performanceThresholds.slowResponseMs) {
      recommendations.push({
        component: "API",
        action: "Enable more optimizations",
        impact: "high",
        description: `Average response time is ${this.metrics.averageResponseTime}ms. Enable compression and deduplication.`,
        implementation: "Set enableCompression and enableDeduplication to true",
      });
    }

    // Check memory usage
    if (this.metrics.memoryUsage > 80) {
      recommendations.push({
        component: "Memory",
        action: "Reduce cache size",
        impact: "medium",
        description: `Memory usage is ${this.metrics.memoryUsage}%. Consider reducing cache size.`,
        implementation: "Reduce cacheConfig.maxSize or decrease TTL values",
      });
    }

    return recommendations;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    globalCache.clear();
    logger.info("All caches cleared");
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  } {
    const status = {
      initialized: this.initialized,
      uptime: Date.now() - this.startTime.getTime(),
      cacheSize: globalCache.size(),
      memoryUsage: this.metrics.memoryUsage,
      averageResponseTime: this.metrics.averageResponseTime,
    };

    let healthStatus: "healthy" | "warning" | "critical" = "healthy";

    if (!this.initialized) {
      healthStatus = "critical";
    } else if (
      this.metrics.memoryUsage > 90 ||
      this.metrics.averageResponseTime > this.config.performanceThresholds.slowResponseMs * 2
    ) {
      healthStatus = "critical";
    } else if (
      this.metrics.memoryUsage > 80 ||
      this.metrics.averageResponseTime > this.config.performanceThresholds.slowResponseMs
    ) {
      healthStatus = "warning";
    }

    return { status: healthStatus, details: status };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info("Cleaning up Phase 2 Performance Orchestrator");
    this.initialized = false;
  }

  /**
   * Setup cache cleanup interval
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      try {
        // This is handled by the cache implementation itself
        logger.debug("Cache cleanup cycle completed");
      } catch (error) {
        logger.error("Cache cleanup failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, this.config.cacheConfig.cleanupInterval);
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMemoryMetrics();
      this.metrics.lastUpdated = new Date();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(operation: "database" | "api", duration: number): void {
    this.metrics.totalRequests++;

    // Update average response time (exponential moving average)
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = duration;
    } else {
      this.metrics.averageResponseTime =
        this.metrics.averageResponseTime * 0.9 + duration * 0.1;
    }

    if (operation === "database") {
      this.metrics.databaseQueries++;
    }

    // Calculate cache hit rate
    const cacheMetrics = globalCache.getMetrics();
    if (cacheMetrics.hits + cacheMetrics.misses > 0) {
      this.metrics.cacheHitRate = cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses);
    }

    // Calculate optimization effectiveness (simplified metric)
    this.metrics.optimizationEffectiveness = Math.min(
      100,
      (this.metrics.cacheHitRate * 50) + 
      (Math.max(0, 100 - this.metrics.averageResponseTime / 10) * 50)
    );
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    this.metrics.memoryUsage = (usedMem / totalMem) * 100;
  }
}

// Global orchestrator instance
let globalOrchestrator: Phase2PerformanceOrchestrator | null = null;

/**
 * Get or create global orchestrator instance
 */
export async function getGlobalOrchestrator(config?: Partial<Phase2Config>): Promise<Phase2PerformanceOrchestrator> {
  if (!globalOrchestrator) {
    globalOrchestrator = new Phase2PerformanceOrchestrator(config);
    await globalOrchestrator.initialize();
  }
  return globalOrchestrator;
}
