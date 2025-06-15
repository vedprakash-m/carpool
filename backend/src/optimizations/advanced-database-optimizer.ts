/**
 * Advanced Database Optimizer
 * Enhanced database optimization with intelligent indexing and advanced caching
 */

import { Container, SqlQuerySpec, IndexingPolicy, ConflictResolutionMode } from "@azure/cosmos";
import { DatabaseQueryOptimizer } from "../utils/database-optimizer";
import { getGlobalEnhancedCache } from "./enhanced-multi-level-cache";
import { logger } from "../utils/logger";

export interface IndexingRecommendation {
  path: string;
  type: "included" | "excluded" | "spatial" | "composite";
  reason: string;
  impact: "low" | "medium" | "high";
  estimatedRuSavings?: number;
}

export interface QueryPattern {
  query: string;
  frequency: number;
  averageRu: number;
  averageDuration: number;
  partitionKeyUsage: boolean;
  filterPaths: string[];
  orderByPaths: string[];
}

export interface ConnectionPoolMetrics {
  activeConnections: number;
  availableConnections: number;
  totalConnections: number;
  averageWaitTime: number;
  peakUsage: number;
}

export interface OptimizationResult {
  queryOptimized: boolean;
  indexingOptimized: boolean;
  cacheUtilized: boolean;
  ruSavings: number;
  durationReduction: number;
  recommendations: string[];
}

/**
 * Advanced Indexing Optimizer
 */
export class AdvancedIndexingOptimizer {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private indexingRecommendations: IndexingRecommendation[] = [];

  /**
   * Analyze query patterns and generate indexing recommendations
   */
  analyzeQueryPatterns(patterns: QueryPattern[]): IndexingRecommendation[] {
    const recommendations: IndexingRecommendation[] = [];

    patterns.forEach(pattern => {
      this.queryPatterns.set(pattern.query, pattern);

      // Analyze filter paths for indexing
      pattern.filterPaths.forEach(path => {
        if (pattern.frequency > 100 && pattern.averageRu > 5) {
          recommendations.push({
            path,
            type: "included",
            reason: `High-frequency query (${pattern.frequency}) with expensive filtering on ${path}`,
            impact: "high",
            estimatedRuSavings: pattern.averageRu * 0.3,
          });
        }
      });

      // Analyze ORDER BY paths
      pattern.orderByPaths.forEach(path => {
        if (pattern.frequency > 50) {
          recommendations.push({
            path,
            type: "included",
            reason: `Frequent sorting on ${path} (${pattern.frequency} times)`,
            impact: "medium",
            estimatedRuSavings: pattern.averageRu * 0.2,
          });
        }
      });

      // Check partition key usage
      if (!pattern.partitionKeyUsage && pattern.averageRu > 10) {
        recommendations.push({
          path: "/*",
          type: "composite",
          reason: "Cross-partition query detected - consider composite indexing",
          impact: "high",
          estimatedRuSavings: pattern.averageRu * 0.5,
        });
      }
    });

    this.indexingRecommendations = recommendations;
    return recommendations;
  }

  /**
   * Generate optimized indexing policy
   */
  generateOptimizedIndexingPolicy(container: Container): IndexingPolicy {
    const basePolicy: IndexingPolicy = {
      indexingMode: "consistent",
      automatic: true,
      includedPaths: [
        {
          path: "/*",
        },
      ],
      excludedPaths: [
        {
          path: '/"_etag"/?',
        },
      ],
    };

    // Add specific included paths based on recommendations
    const highImpactPaths = this.indexingRecommendations
      .filter(rec => rec.impact === "high" && rec.type === "included")
      .map(rec => ({ path: rec.path }));

    if (highImpactPaths.length > 0) {
      basePolicy.includedPaths!.push(...highImpactPaths);
    }

    // Add composite indexes for complex queries
    const compositePaths = this.indexingRecommendations
      .filter(rec => rec.type === "composite")
      .map(rec => rec.path);

    if (compositePaths.length > 0) {
      basePolicy.compositeIndexes = [
        compositePaths.map(path => ({ path, order: "ascending" as const })),
      ];
    }

    logger.info("Generated optimized indexing policy", {
      includedPaths: basePolicy.includedPaths?.length || 0,
      excludedPaths: basePolicy.excludedPaths?.length || 0,
      compositeIndexes: basePolicy.compositeIndexes?.length || 0,
    });

    return basePolicy;
  }
}

/**
 * Query Performance Tuner
 */
export class QueryPerformanceTuner {
  private performanceHistory: Map<string, Array<{ ru: number; duration: number; timestamp: Date }>> = new Map();

  /**
   * Optimize query based on performance history
   */
  async optimizeQuery(
    container: Container,
    querySpec: SqlQuerySpec,
    partitionKey?: string
  ): Promise<OptimizationResult> {
    const queryHash = this.generateQueryHash(querySpec);
    const startTime = Date.now();
    const enhancedCache = await getGlobalEnhancedCache();

    const result: OptimizationResult = {
      queryOptimized: false,
      indexingOptimized: false,
      cacheUtilized: false,
      ruSavings: 0,
      durationReduction: 0,
      recommendations: [],
    };

    try {
      // Check enhanced cache first
      const cacheKey = `query:optimized:${queryHash}`;
      const cachedResult = await enhancedCache.get(cacheKey);
      
      if (cachedResult) {
        result.cacheUtilized = true;
        result.durationReduction = Date.now() - startTime;
        logger.debug("Query served from enhanced cache", { queryHash });
        return result;
      }

      // Execute optimized query
      const queryResult = await DatabaseQueryOptimizer.executeQuery(
        container,
        querySpec,
        partitionKey,
        {
          enableCaching: true,
          cacheTtl: 10 * 60 * 1000, // 10 minutes
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Store performance metrics (simplified RU calculation)
      const estimatedRu = this.estimateRuCost(querySpec, queryResult.length);
      this.recordPerformance(queryHash, estimatedRu, duration);

      // Cache the result in enhanced cache
      await enhancedCache.set(cacheKey, queryResult, { ttl: 10 * 60 * 1000, level: "l2" });

      // Generate recommendations
      result.recommendations = this.generateRecommendations(querySpec, estimatedRu, duration);
      result.queryOptimized = true;
      result.durationReduction = this.calculateDurationReduction(queryHash, duration);
      result.ruSavings = this.calculateRuSavings(queryHash, estimatedRu);

      logger.info("Query optimization completed", {
        queryHash,
        duration,
        estimatedRu,
        cacheUtilized: result.cacheUtilized,
        recommendations: result.recommendations.length,
      });

      return result;
    } catch (error) {
      logger.error("Query optimization failed", {
        queryHash,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Generate query hash for caching
   */
  private generateQueryHash(querySpec: SqlQuerySpec): string {
    const queryString = JSON.stringify({
      query: querySpec.query,
      parameters: querySpec.parameters,
    });
    return Buffer.from(queryString).toString("base64").substring(0, 32);
  }

  /**
   * Estimate RU cost based on query complexity
   */
  private estimateRuCost(querySpec: SqlQuerySpec, resultCount: number): number {
    let baseCost = 2.3; // Base cost for simple queries

    // Increase cost for complex operations
    if (querySpec.query.toLowerCase().includes("join")) baseCost += 2;
    if (querySpec.query.toLowerCase().includes("order by")) baseCost += 1;
    if (querySpec.query.toLowerCase().includes("group by")) baseCost += 1.5;
    if (querySpec.query.toLowerCase().includes("where")) baseCost += 0.5;

    // Scale by result count
    return Math.max(baseCost, baseCost + (resultCount * 0.1));
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(queryHash: string, ru: number, duration: number): void {
    if (!this.performanceHistory.has(queryHash)) {
      this.performanceHistory.set(queryHash, []);
    }

    const history = this.performanceHistory.get(queryHash)!;
    history.push({ ru, duration, timestamp: new Date() });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Calculate duration reduction compared to historical average
   */
  private calculateDurationReduction(queryHash: string, currentDuration: number): number {
    const history = this.performanceHistory.get(queryHash);
    if (!history || history.length < 2) return 0;

    const avgDuration = history.reduce((sum, entry) => sum + entry.duration, 0) / history.length;
    return Math.max(0, avgDuration - currentDuration);
  }

  /**
   * Calculate RU savings compared to historical average
   */
  private calculateRuSavings(queryHash: string, currentRu: number): number {
    const history = this.performanceHistory.get(queryHash);
    if (!history || history.length < 2) return 0;

    const avgRu = history.reduce((sum, entry) => sum + entry.ru, 0) / history.length;
    return Math.max(0, avgRu - currentRu);
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(querySpec: SqlQuerySpec, ru: number, duration: number): string[] {
    const recommendations: string[] = [];

    if (ru > 10) {
      recommendations.push("Consider adding specific indexing for frequently filtered fields");
    }

    if (duration > 1000) {
      recommendations.push("Query duration is high - consider using partition key in WHERE clause");
    }

    if (querySpec.query.toLowerCase().includes("select *")) {
      recommendations.push("Avoid SELECT * - specify only needed fields to reduce RU cost");
    }

    if (!querySpec.query.toLowerCase().includes("where")) {
      recommendations.push("Add WHERE clause with partition key for better performance");
    }

    return recommendations;
  }
}

/**
 * Advanced Connection Pooling
 */
export class AdvancedConnectionPooling {
  private connections: Map<string, any> = new Map();
  private connectionMetrics: ConnectionPoolMetrics;
  private maxConnections: number = 50;
  private minConnections: number = 10;

  constructor(maxConnections = 50, minConnections = 10) {
    this.maxConnections = maxConnections;
    this.minConnections = minConnections;
    this.connectionMetrics = {
      activeConnections: 0,
      availableConnections: 0,
      totalConnections: 0,
      averageWaitTime: 0,
      peakUsage: 0,
    };
  }

  /**
   * Get connection pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    this.connectionMetrics.totalConnections = this.connections.size;
    this.connectionMetrics.availableConnections = Math.max(
      0,
      this.maxConnections - this.connectionMetrics.activeConnections
    );
    
    return { ...this.connectionMetrics };
  }

  /**
   * Health check for connection pool
   */
  healthCheck(): { status: "healthy" | "warning" | "critical"; details: any } {
    const metrics = this.getMetrics();
    let status: "healthy" | "warning" | "critical" = "healthy";

    if (metrics.activeConnections >= this.maxConnections * 0.9) {
      status = "critical";
    } else if (metrics.activeConnections >= this.maxConnections * 0.7) {
      status = "warning";
    }

    return {
      status,
      details: {
        ...metrics,
        utilizationPercent: (metrics.activeConnections / this.maxConnections) * 100,
      },
    };
  }
}

/**
 * Advanced Cache Optimizer
 */
export class AdvancedCacheOptimizer {
  private cachePatterns: Map<string, { hits: number; misses: number; lastAccess: Date }> = new Map();

  /**
   * Analyze cache patterns and optimize
   */
  async optimizeCachePatterns(): Promise<{
    recommendations: string[];
    patternsAnalyzed: number;
    optimizationsApplied: number;
  }> {
    const enhancedCache = await getGlobalEnhancedCache();
    const analytics = enhancedCache.getAnalytics();
    const recommendations: string[] = [];

    // Analyze hit rates by level
    analytics.levelMetrics.forEach(level => {
      if (level.hitRate < 0.7) {
        recommendations.push(`${level.level} cache hit rate is low (${(level.hitRate * 100).toFixed(1)}%) - consider increasing TTL`);
      }
    });

    // Overall performance recommendations
    if (analytics.overallHitRate < 0.8) {
      recommendations.push("Overall cache hit rate is below 80% - review caching strategy");
    }

    if (analytics.memoryUsage > 500) {
      recommendations.push("High memory usage detected - consider reducing cache sizes");
    }

    return {
      recommendations,
      patternsAnalyzed: this.cachePatterns.size,
      optimizationsApplied: recommendations.length,
    };
  }

  /**
   * Predictive cache warming
   */
  async warmPredictiveCache(container: Container): Promise<void> {
    const enhancedCache = await getGlobalEnhancedCache();
    
    // Warm cache with commonly accessed patterns
    const commonPatterns = [
      "SELECT * FROM c WHERE c.type = 'user'",
      "SELECT * FROM c WHERE c.status = 'active'",
      "SELECT * FROM c WHERE c.createdDate >= @today",
    ];

    for (const pattern of commonPatterns) {
      try {
        const querySpec: SqlQuerySpec = {
          query: pattern,
          parameters: [{ name: "@today", value: new Date().toISOString().split('T')[0] }],
        };

        const results = await DatabaseQueryOptimizer.executeQuery(container, querySpec);
        await enhancedCache.set(
          `predictive:${pattern}`,
          results,
          { ttl: 30 * 60 * 1000, level: "l2" }
        );

        logger.debug("Predictive cache warmed", { pattern, resultCount: results.length });
      } catch (error) {
        logger.warn("Predictive cache warming failed", {
          pattern,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }
}

/**
 * Advanced Database Optimizer - Main Class
 */
export class AdvancedDatabaseOptimizer {
  private indexingOptimizer: AdvancedIndexingOptimizer;
  private queryTuner: QueryPerformanceTuner;
  private connectionPool: AdvancedConnectionPooling;
  private cacheOptimizer: AdvancedCacheOptimizer;

  constructor() {
    this.indexingOptimizer = new AdvancedIndexingOptimizer();
    this.queryTuner = new QueryPerformanceTuner();
    this.connectionPool = new AdvancedConnectionPooling();
    this.cacheOptimizer = new AdvancedCacheOptimizer();
  }

  /**
   * Comprehensive database optimization
   */
  async optimizeDatabase(container: Container, queryPatterns: QueryPattern[]): Promise<{
    indexingRecommendations: IndexingRecommendation[];
    cacheOptimization: any;
    connectionMetrics: ConnectionPoolMetrics;
    overallHealth: string;
  }> {
    logger.info("Starting comprehensive database optimization");

    try {
      // Analyze and optimize indexing
      const indexingRecommendations = this.indexingOptimizer.analyzeQueryPatterns(queryPatterns);

      // Optimize cache patterns
      const cacheOptimization = await this.cacheOptimizer.optimizeCachePatterns();

      // Get connection metrics
      const connectionMetrics = this.connectionPool.getMetrics();

      // Perform predictive cache warming
      await this.cacheOptimizer.warmPredictiveCache(container);

      const overallHealth = this.assessOverallHealth(indexingRecommendations, cacheOptimization, connectionMetrics);

      logger.info("Database optimization completed", {
        indexingRecommendations: indexingRecommendations.length,
        cacheRecommendations: cacheOptimization.recommendations.length,
        overallHealth,
      });

      return {
        indexingRecommendations,
        cacheOptimization,
        connectionMetrics,
        overallHealth,
      };
    } catch (error) {
      logger.error("Database optimization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Optimize a specific query
   */
  async optimizeQuery(
    container: Container,
    querySpec: SqlQuerySpec,
    partitionKey?: string
  ): Promise<OptimizationResult> {
    return this.queryTuner.optimizeQuery(container, querySpec, partitionKey);
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  } {
    const connectionHealth = this.connectionPool.healthCheck();
    
    return {
      status: connectionHealth.status,
      details: {
        connections: connectionHealth.details,
        optimizer: "Advanced Database Optimizer active",
        lastOptimization: new Date().toISOString(),
      },
    };
  }

  /**
   * Assess overall health
   */
  private assessOverallHealth(
    indexingRecommendations: IndexingRecommendation[],
    cacheOptimization: any,
    connectionMetrics: ConnectionPoolMetrics
  ): string {
    const highImpactRecommendations = indexingRecommendations.filter(rec => rec.impact === "high").length;
    const connectionUtilization = (connectionMetrics.activeConnections / 50) * 100; // Assuming max 50

    if (highImpactRecommendations > 5 || connectionUtilization > 90) {
      return "critical";
    } else if (highImpactRecommendations > 2 || connectionUtilization > 70) {
      return "warning";
    } else {
      return "healthy";
    }
  }
}
