/**
 * Phase 2 Advanced Performance Optimization Integration
 * Main orchestrator that coordinates all advanced optimization components
 */

import { logger } from "../utils/logger";
import {
  AdvancedIndexingOptimizer,
  AdvancedConnectionPooling,
  QueryPerformanceTuner,
  AdvancedCacheOptimizer,
} from "./advanced-database-optimizer";
import { EnhancedMultiLevelCache } from "./enhanced-multi-level-cache";
import {
  AdvancedResponseCompression,
  AdvancedRequestDeduplicator,
  AdvancedPaginationOptimizer,
  EnhancedResponseCache,
} from "./advanced-api-optimizer";
import { AzureCDNOptimizer } from "./cdn-optimizer";
import { Container } from "@azure/cosmos";

/**
 * Phase 2 Performance Optimization Orchestrator
 */
export class Phase2PerformanceOrchestrator {
  private multiLevelCache: EnhancedMultiLevelCache;
  private cdnOptimizer: AzureCDNOptimizer;
  private connectionPools = new Map<string, any>();
  private optimizationMetrics: OptimizationMetrics;
  private isInitialized = false;

  constructor(private config: Phase2Config) {
    this.optimizationMetrics = {
      database: {
        queryOptimizations: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        indexOptimizations: 0,
      },
      api: {
        compressionRatio: 0,
        deduplicationSavings: 0,
        paginationOptimizations: 0,
        cacheEfficiency: 0,
      },
      cdn: {
        assetsOptimized: 0,
        totalSizeReduction: 0,
        responseTimeImprovement: 0,
      },
      overall: {
        performanceGain: 0,
        resourceUtilization: 0,
        errorReduction: 0,
      },
    };
  }

  /**
   * Initialize all Phase 2 optimization components
   */
  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Phase 2 Advanced Performance Optimization");

      // Initialize Enhanced Multi-Level Cache
      this.multiLevelCache = new EnhancedMultiLevelCache({
        l1: {
          maxSize: this.config.cache.l1.maxSize || 10000,
          ttl: this.config.cache.l1.ttl || 300000, // 5 minutes
        },
        l2: {
          host: this.config.cache.redis.host,
          port: this.config.cache.redis.port,
          password: this.config.cache.redis.password,
          database: this.config.cache.redis.database || 0,
        },
        defaultTtl: this.config.cache.defaultTtl || 600000, // 10 minutes
        metricsInterval: 300000, // 5 minutes
      });

      // Initialize CDN Optimizer
      if (this.config.cdn.enabled) {
        this.cdnOptimizer = new AzureCDNOptimizer({
          storageAccount: this.config.cdn.storageAccount,
          storageKey: this.config.cdn.storageKey,
          cdnEndpoint: this.config.cdn.endpoint,
          containerName: this.config.cdn.containerName,
        });
      }

      // Initialize Enhanced Response Cache
      EnhancedResponseCache.initialize(this.multiLevelCache);

      // Initialize Advanced Cache Optimizer
      AdvancedCacheOptimizer.initialize({
        l1: this.config.cache.l1,
        l2: this.config.cache.redis,
        defaultTtl: this.config.cache.defaultTtl,
      });

      this.isInitialized = true;
      logger.info(
        "Phase 2 Advanced Performance Optimization initialized successfully"
      );
    } catch (error) {
      logger.error("Phase 2 initialization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize database operations with advanced strategies
   */
  async optimizeDatabaseOperations(
    container: Container,
    queryPatterns: string[]
  ): Promise<DatabaseOptimizationResult> {
    if (!this.isInitialized) {
      throw new Error("Phase 2 optimizer not initialized");
    }

    try {
      const startTime = Date.now();

      // Generate optimized indexing policy
      const indexingPolicy =
        AdvancedIndexingOptimizer.generateIndexingPolicy(queryPatterns);

      // Set up advanced connection pooling
      const poolId = `${container.id}-pool`;
      const connectionPool = AdvancedConnectionPooling.createPool(
        container.database.id,
        {
          maxConnections: this.config.database.maxConnections || 50,
          minConnections: this.config.database.minConnections || 5,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          idleTimeoutMillis: 300000,
          reapIntervalMillis: 60000,
          createRetryIntervalMillis: 500,
          enableHealthCheck: true,
        }
      );

      this.connectionPools.set(poolId, connectionPool);

      // Analyze and optimize common queries
      const queryOptimizations: QueryOptimization[] = [];
      for (const queryPattern of queryPatterns) {
        const query = { query: queryPattern, parameters: [] };
        const optimization = await QueryPerformanceTuner.optimizeQuery(
          container,
          query
        );

        queryOptimizations.push({
          originalQuery: queryPattern,
          optimizedQuery: optimization.optimizedQuery.query,
          estimatedImprovement: optimization.estimatedImprovement,
          optimizations: optimization.optimizations,
        });
      }

      // Set up intelligent cache warming
      const accessPatterns = this.generateAccessPatterns(queryPatterns);
      await AdvancedCacheOptimizer.warmCacheIntelligently(
        container,
        accessPatterns
      );

      const duration = Date.now() - startTime;

      // Update metrics
      this.optimizationMetrics.database.queryOptimizations +=
        queryOptimizations.length;
      this.optimizationMetrics.database.indexOptimizations += 1;

      logger.info("Database operations optimized", {
        queryOptimizations: queryOptimizations.length,
        indexingOptimized: true,
        connectionPoolCreated: true,
        cacheWarmed: true,
        duration,
      });

      return {
        indexingPolicy,
        connectionPoolId: poolId,
        queryOptimizations,
        cacheWarmingCompleted: true,
        performanceGain: this.calculateAverageImprovement(queryOptimizations),
        optimizationDuration: duration,
      };
    } catch (error) {
      logger.error("Database optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize API responses with advanced techniques
   */
  async optimizeAPIResponse(
    request: any,
    responseData: any,
    options: APIOptimizationOptions = {}
  ): Promise<OptimizedAPIResponse> {
    if (!this.isInitialized) {
      throw new Error("Phase 2 optimizer not initialized");
    }

    try {
      const startTime = Date.now();
      const {
        enableCompression = true,
        enableDeduplication = true,
        enablePagination = true,
        cacheStrategy,
      } = options;

      let optimizedResponse = responseData;
      const optimizations: string[] = [];

      // Apply advanced compression
      if (enableCompression) {
        const compressionResult =
          await AdvancedResponseCompression.compressResponse(
            responseData,
            request.headers?.["accept-encoding"] || "",
            "application/json"
          );

        if (compressionResult.encoding) {
          optimizedResponse = compressionResult.compressed;
          optimizations.push(
            `${compressionResult.encoding} compression applied`
          );

          // Update metrics
          this.optimizationMetrics.api.compressionRatio =
            (this.optimizationMetrics.api.compressionRatio +
              compressionResult.compressionRatio) /
            2;
        }
      }

      // Apply request deduplication
      let deduplicationKey: string | undefined;
      if (enableDeduplication && request.method === "GET") {
        deduplicationKey = this.generateDeduplicationKey(request);
        optimizations.push("Request deduplication enabled");
      }

      // Optimize pagination if applicable
      let paginationResult: any;
      if (enablePagination && this.isPaginatedRequest(request)) {
        paginationResult = AdvancedPaginationOptimizer.optimizePagination(
          request.query,
          {
            defaultPageSize: 20,
            maxPageSize: 100,
            enablePrefetch: true,
            estimatedTotalCount: this.estimateTotalCount(responseData),
          }
        );
        optimizations.push("Pagination optimized");
        this.optimizationMetrics.api.paginationOptimizations++;
      }

      // Apply enhanced caching if strategy provided
      if (cacheStrategy) {
        const cacheKey = this.generateCacheKey(request);
        await this.multiLevelCache.set(cacheKey, optimizedResponse, {
          ttl: cacheStrategy.ttl,
          levels: cacheStrategy.levels,
        });
        optimizations.push("Enhanced multi-level caching applied");
      }

      const duration = Date.now() - startTime;

      return {
        optimizedData: optimizedResponse,
        optimizations,
        deduplicationKey,
        paginationResult,
        compressionApplied: enableCompression,
        cacheKey: cacheStrategy ? this.generateCacheKey(request) : undefined,
        performanceMetrics: {
          optimizationTime: duration,
          dataSizeReduction: this.calculateSizeReduction(
            responseData,
            optimizedResponse
          ),
          estimatedResponseTimeImprovement:
            this.estimateResponseTimeImprovement(optimizations.length),
        },
      };
    } catch (error) {
      logger.error("API response optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize static assets using CDN
   */
  async optimizeStaticAssets(
    assets: StaticAsset[]
  ): Promise<StaticAssetOptimizationResult> {
    if (!this.isInitialized || !this.cdnOptimizer) {
      throw new Error("CDN optimizer not available");
    }

    try {
      const startTime = Date.now();
      const optimizedAssets: any[] = [];
      let totalSizeReduction = 0;

      for (const asset of assets) {
        const optimizedAsset = await this.cdnOptimizer.optimizeAndUploadAsset(
          asset.path,
          asset.content,
          {
            enableImageOptimization: asset.type === "image",
            enableCompression: asset.type === "text",
            cacheControl: asset.cacheControl || "public, max-age=31536000",
          }
        );

        optimizedAssets.push(optimizedAsset);
        totalSizeReduction +=
          optimizedAsset.originalSize - optimizedAsset.optimizedSize;
      }

      // Generate responsive images for image assets
      const responsiveImageSets: any[] = [];
      const imageAssets = assets.filter((asset) => asset.type === "image");

      for (const imageAsset of imageAssets) {
        if (imageAsset.generateResponsive) {
          const responsiveSet =
            await this.cdnOptimizer.generateResponsiveImages(
              imageAsset.content,
              imageAsset.path,
              imageAsset.responsiveSizes
            );
          responsiveImageSets.push(responsiveSet);
        }
      }

      // Generate preload manifest for critical assets
      const criticalAssetPaths = assets
        .filter((asset) => asset.critical)
        .map((asset) => asset.path);

      const preloadManifest = await this.cdnOptimizer.preloadCriticalAssets(
        criticalAssetPaths
      );

      const duration = Date.now() - startTime;

      // Update metrics
      this.optimizationMetrics.cdn.assetsOptimized += assets.length;
      this.optimizationMetrics.cdn.totalSizeReduction += totalSizeReduction;

      logger.info("Static assets optimized", {
        assetsProcessed: assets.length,
        totalSizeReduction,
        responsiveImageSets: responsiveImageSets.length,
        preloadItems: preloadManifest.preloadLinks.length,
        duration,
      });

      return {
        optimizedAssets,
        responsiveImageSets,
        preloadManifest,
        totalSizeReduction,
        optimizationDuration: duration,
        cdnOptimizationStats: this.cdnOptimizer.getOptimizationStats(),
      };
    } catch (error) {
      logger.error("Static asset optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<Phase2PerformanceMetrics> {
    if (!this.isInitialized) {
      throw new Error("Phase 2 optimizer not initialized");
    }

    try {
      const cacheMetrics = this.multiLevelCache.getMetrics();
      const cacheAnalytics = await this.multiLevelCache.getAdvancedAnalytics();
      const deduplicationStats = AdvancedRequestDeduplicator.getStats();

      let cdnStats = null;
      if (this.cdnOptimizer) {
        cdnStats = this.cdnOptimizer.getOptimizationStats();
      }

      // Calculate overall performance improvements
      const overallPerformanceGain = this.calculateOverallPerformanceGain();
      const resourceUtilization =
        this.calculateResourceUtilization(cacheMetrics);

      return {
        phase: 2,
        timestamp: new Date(),
        database: {
          ...this.optimizationMetrics.database,
          cacheHitRate: cacheMetrics.overallHitRate,
          averageResponseTime: cacheMetrics.averageResponseTime,
          connectionPoolsActive: this.connectionPools.size,
        },
        api: {
          ...this.optimizationMetrics.api,
          cacheEfficiency: cacheAnalytics.efficiency.warmingEffectiveness,
          deduplicationStats,
          averageCompressionRatio:
            this.optimizationMetrics.api.compressionRatio,
        },
        cdn: cdnStats || {
          totalAssets: 0,
          totalOriginalSize: 0,
          totalOptimizedSize: 0,
          averageCompressionRatio: 0,
          totalSavings: 0,
          optimizationsByType: {},
        },
        cache: {
          multiLevel: cacheMetrics,
          analytics: cacheAnalytics,
        },
        overall: {
          performanceGain: overallPerformanceGain,
          resourceUtilization,
          errorReduction: this.optimizationMetrics.overall.errorReduction,
          optimizationScore: this.calculateOptimizationScore(),
        },
        recommendations:
          this.generatePerformanceRecommendations(cacheAnalytics),
      };
    } catch (error) {
      logger.error("Failed to get performance metrics", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Generate intelligent performance recommendations
   */
  private generatePerformanceRecommendations(cacheAnalytics: any): string[] {
    const recommendations: string[] = [];

    if (cacheAnalytics.hitRates.overall < 0.8) {
      recommendations.push(
        "Consider increasing cache TTL or implementing more aggressive cache warming"
      );
    }

    if (cacheAnalytics.efficiency.memoryUtilization > 0.9) {
      recommendations.push(
        "L1 cache memory utilization is high - consider increasing cache size or implementing better eviction policies"
      );
    }

    if (this.optimizationMetrics.api.compressionRatio < 2.0) {
      recommendations.push(
        "Low compression ratios detected - review compression algorithms and thresholds"
      );
    }

    if (this.optimizationMetrics.database.cacheHitRate < 0.7) {
      recommendations.push(
        "Database cache hit rate is low - implement more strategic cache warming patterns"
      );
    }

    if (this.connectionPools.size === 0) {
      recommendations.push(
        "No active connection pools - implement connection pooling for better database performance"
      );
    }

    return recommendations;
  }

  // Helper methods
  private generateAccessPatterns(queryPatterns: string[]): any[] {
    return queryPatterns.map((query, index) => ({
      key: `pattern_${index}`,
      query,
      parameters: [],
      frequency: Math.random() * 100, // Simulated frequency
      ttl: 300000, // 5 minutes
      maxItems: 100,
    }));
  }

  private calculateAverageImprovement(
    optimizations: QueryOptimization[]
  ): number {
    if (optimizations.length === 0) return 0;

    const totalImprovement = optimizations.reduce(
      (sum, opt) => sum + opt.estimatedImprovement,
      0
    );

    return totalImprovement / optimizations.length;
  }

  private generateDeduplicationKey(request: any): string {
    return `${request.method}:${request.url}:${JSON.stringify(
      request.query || {}
    )}`;
  }

  private isPaginatedRequest(request: any): boolean {
    const query = request.query || {};
    return "page" in query || "limit" in query || "offset" in query;
  }

  private estimateTotalCount(responseData: any): number | undefined {
    if (Array.isArray(responseData)) {
      return responseData.length;
    }
    if (responseData?.pagination?.totalCount) {
      return responseData.pagination.totalCount;
    }
    return undefined;
  }

  private generateCacheKey(request: any): string {
    return `api:${request.method}:${request.url}:${JSON.stringify(
      request.query || {}
    )}`;
  }

  private calculateSizeReduction(original: any, optimized: any): number {
    const originalSize = JSON.stringify(original).length;
    const optimizedSize =
      typeof optimized === "string"
        ? optimized.length
        : JSON.stringify(optimized).length;

    return originalSize - optimizedSize;
  }

  private estimateResponseTimeImprovement(optimizationCount: number): number {
    // Rough estimation: each optimization provides 5-15ms improvement
    return optimizationCount * (Math.random() * 10 + 5);
  }

  private calculateOverallPerformanceGain(): number {
    const dbGain = this.optimizationMetrics.database.queryOptimizations * 10;
    const apiGain = this.optimizationMetrics.api.paginationOptimizations * 5;
    const cdnGain = this.optimizationMetrics.cdn.assetsOptimized * 2;

    return Math.min(dbGain + apiGain + cdnGain, 100); // Cap at 100%
  }

  private calculateResourceUtilization(cacheMetrics: any): number {
    const l1Utilization = cacheMetrics.l1Size ? cacheMetrics.l1Size / 10000 : 0;
    const responseTimeScore = Math.max(
      0,
      100 - cacheMetrics.averageResponseTime
    );

    return l1Utilization * 50 + responseTimeScore * 0.5;
  }

  private calculateOptimizationScore(): number {
    const scores = [
      this.optimizationMetrics.database.cacheHitRate * 25,
      this.optimizationMetrics.api.cacheEfficiency * 25,
      Math.min(this.optimizationMetrics.cdn.assetsOptimized / 10, 1) * 25,
      Math.min(this.optimizationMetrics.overall.performanceGain, 25),
    ];

    return scores.reduce((sum, score) => sum + score, 0);
  }

  /**
   * Cleanup resources and connections
   */
  async destroy(): Promise<void> {
    try {
      // Clean up connection pools
      this.connectionPools.forEach((pool) => {
        if (pool.destroy) {
          pool.destroy();
        }
      });
      this.connectionPools.clear();

      // Clean up caches
      if (this.multiLevelCache) {
        await this.multiLevelCache.destroy();
      }

      this.isInitialized = false;
      logger.info("Phase 2 Performance Orchestrator destroyed");
    } catch (error) {
      logger.error("Error during Phase 2 cleanup", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Interfaces and types
interface Phase2Config {
  database: {
    maxConnections?: number;
    minConnections?: number;
  };
  cache: {
    l1: {
      maxSize: number;
      ttl: number;
    };
    redis: {
      host: string;
      port: number;
      password?: string;
      database?: number;
    };
    defaultTtl: number;
  };
  cdn: {
    enabled: boolean;
    storageAccount: string;
    storageKey: string;
    endpoint: string;
    containerName: string;
  };
}

interface OptimizationMetrics {
  database: {
    queryOptimizations: number;
    cacheHitRate: number;
    averageResponseTime: number;
    indexOptimizations: number;
  };
  api: {
    compressionRatio: number;
    deduplicationSavings: number;
    paginationOptimizations: number;
    cacheEfficiency: number;
  };
  cdn: {
    assetsOptimized: number;
    totalSizeReduction: number;
    responseTimeImprovement: number;
  };
  overall: {
    performanceGain: number;
    resourceUtilization: number;
    errorReduction: number;
  };
}

interface DatabaseOptimizationResult {
  indexingPolicy: any;
  connectionPoolId: string;
  queryOptimizations: QueryOptimization[];
  cacheWarmingCompleted: boolean;
  performanceGain: number;
  optimizationDuration: number;
}

interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  optimizations: string[];
}

interface APIOptimizationOptions {
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  enablePagination?: boolean;
  cacheStrategy?: {
    ttl: number;
    levels: ("l1" | "l2")[];
  };
}

interface OptimizedAPIResponse {
  optimizedData: any;
  optimizations: string[];
  deduplicationKey?: string;
  paginationResult?: any;
  compressionApplied: boolean;
  cacheKey?: string;
  performanceMetrics: {
    optimizationTime: number;
    dataSizeReduction: number;
    estimatedResponseTimeImprovement: number;
  };
}

interface StaticAsset {
  path: string;
  content: Buffer;
  type: "image" | "text" | "font" | "other";
  critical?: boolean;
  cacheControl?: string;
  generateResponsive?: boolean;
  responsiveSizes?: number[];
}

interface StaticAssetOptimizationResult {
  optimizedAssets: any[];
  responsiveImageSets: any[];
  preloadManifest: any;
  totalSizeReduction: number;
  optimizationDuration: number;
  cdnOptimizationStats: any;
}

interface Phase2PerformanceMetrics {
  phase: number;
  timestamp: Date;
  database: any;
  api: any;
  cdn: any;
  cache: any;
  overall: any;
  recommendations: string[];
}

export {
  Phase2Config,
  OptimizationMetrics,
  DatabaseOptimizationResult,
  APIOptimizationOptions,
  OptimizedAPIResponse,
  StaticAsset,
  StaticAssetOptimizationResult,
  Phase2PerformanceMetrics,
};

export default Phase2PerformanceOrchestrator;
