/**
 * Enhanced Multi-Level Caching Strategy Implementation
 * Phase 2: L1 (Memory), L2 (Redis), L3 (Database) with smart invalidation and cache warming
 */

import { Redis } from "ioredis";
import { LRUCache } from "lru-cache";
import { logger } from "../utils/logger";
import { globalCache } from "../utils/cache";

/**
 * Enhanced multi-level cache with intelligent optimization
 */
export class EnhancedMultiLevelCache {
  private l1Cache: LRUCache<string, CacheEntry>;
  private l2Cache: Redis;
  private config: EnhancedCacheConfig;
  private metrics: CacheMetrics;
  private warmingQueue: Set<string>;
  private invalidationCallbacks: Map<string, (() => void)[]>;

  constructor(config: EnhancedCacheConfig) {
    this.config = config;
    this.warmingQueue = new Set();
    this.invalidationCallbacks = new Map();
    this.metrics = {
      l1: { hits: 0, misses: 0, evictions: 0, totalRequests: 0 },
      l2: { hits: 0, misses: 0, evictions: 0, totalRequests: 0 },
      l3: { hits: 0, misses: 0, evictions: 0, totalRequests: 0 },
      overallHitRate: 0,
      averageResponseTime: 0,
    };

    this.initializeCaches();
    this.startMetricsCollection();
  }

  private initializeCaches(): void {
    // L1 Cache (Memory) - Fastest access
    this.l1Cache = new LRUCache({
      max: this.config.l1.maxSize,
      ttl: this.config.l1.ttl,
      updateAgeOnGet: true,
      allowStale: false,
      dispose: (key, value) => {
        this.metrics.l1.evictions++;
        logger.debug("L1 cache entry evicted", { key });
      },
    });

    // L2 Cache (Redis) - Network cache
    this.l2Cache = new Redis({
      host: this.config.l2.host,
      port: this.config.l2.port,
      password: this.config.l2.password,
      db: this.config.l2.database || 0,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      connectTimeout: this.config.l2.connectTimeout || 10000,
      commandTimeout: this.config.l2.commandTimeout || 5000,
    });

    // Set up Redis event handlers
    this.l2Cache.on("connect", () => {
      logger.info("Redis L2 cache connected");
    });

    this.l2Cache.on("error", (error) => {
      logger.warn("Redis L2 cache error", { error: error.message });
    });
  }

  /**
   * Get value from multi-level cache with fallback strategy
   */
  async get<T>(key: string, fallbackFn?: () => Promise<T>): Promise<T | null> {
    const startTime = Date.now();

    try {
      // Try L1 Cache first (fastest)
      const l1Result = this.l1Cache.get(key);
      if (l1Result && !this.isExpired(l1Result)) {
        this.metrics.l1.hits++;
        this.metrics.l1.totalRequests++;
        this.updateResponseTime(startTime);

        logger.debug("L1 cache hit", {
          key,
          responseTime: Date.now() - startTime,
        });
        return l1Result.data as T;
      }
      this.metrics.l1.misses++;
      this.metrics.l1.totalRequests++;

      // Try L2 Cache (Redis)
      const l2Result = await this.getFromL2<T>(key);
      if (l2Result !== null) {
        this.metrics.l2.hits++;
        this.metrics.l2.totalRequests++;

        // Populate L1 cache for faster subsequent access
        this.setInL1(key, l2Result, this.config.l1.ttl);
        this.updateResponseTime(startTime);

        logger.debug("L2 cache hit", {
          key,
          responseTime: Date.now() - startTime,
        });
        return l2Result;
      }
      this.metrics.l2.misses++;
      this.metrics.l2.totalRequests++;

      // L3 fallback (Database/Function)
      if (fallbackFn) {
        const l3Result = await fallbackFn();
        if (l3Result !== null) {
          this.metrics.l3.hits++;

          // Store in all cache levels for future access
          await this.setInAllLevels(key, l3Result);
          this.updateResponseTime(startTime);

          logger.debug("L3 fallback successful", {
            key,
            responseTime: Date.now() - startTime,
          });
          return l3Result;
        }
      }
      this.metrics.l3.misses++;
      this.metrics.l3.totalRequests++;

      this.updateResponseTime(startTime);
      return null;
    } catch (error) {
      logger.error("Multi-level cache get error", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      });

      // Try fallback on cache error
      if (fallbackFn) {
        try {
          return await fallbackFn();
        } catch (fallbackError) {
          logger.error("Fallback function failed", {
            key,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unknown error",
          });
        }
      }

      return null;
    }
  }

  /**
   * Set value in multi-level cache with intelligent distribution
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheSetOptions
  ): Promise<void> {
    const ttl = options?.ttl || this.config.defaultTtl;
    const levels = options?.levels || ["l1", "l2"];

    try {
      if (levels.includes("l1")) {
        this.setInL1(key, value, ttl);
      }

      if (levels.includes("l2")) {
        await this.setInL2(key, value, ttl);
      }

      // Register invalidation callbacks if provided
      if (options?.onInvalidate) {
        this.registerInvalidationCallback(key, options.onInvalidate);
      }

      logger.debug("Multi-level cache set completed", {
        key,
        levels: levels.join(","),
        ttl,
      });
    } catch (error) {
      logger.error("Multi-level cache set error", {
        key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Intelligent cache invalidation with pattern matching
   */
  async invalidate(pattern: string | string[]): Promise<void> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    for (const pat of patterns) {
      await this.invalidatePattern(pat);
    }
  }

  private async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Invalidate L1 cache
      const l1Keys = Array.from(this.l1Cache.keys());
      const l1MatchingKeys = l1Keys.filter((key) =>
        this.matchesPattern(key, pattern)
      );

      l1MatchingKeys.forEach((key) => {
        this.l1Cache.delete(key);
        this.executeInvalidationCallbacks(key);
      });

      // Invalidate L2 cache
      await this.invalidateL2Pattern(pattern);

      logger.debug("Cache invalidation completed", {
        pattern,
        l1Invalidated: l1MatchingKeys.length,
      });
    } catch (error) {
      logger.error("Cache invalidation error", {
        pattern,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async invalidateL2Pattern(pattern: string): Promise<void> {
    try {
      const stream = this.l2Cache.scanStream({
        match: pattern.includes("*") ? pattern : `*${pattern}*`,
        count: 100,
      });

      const pipeline = this.l2Cache.pipeline();
      let deleteCount = 0;

      stream.on("data", (keys: string[]) => {
        keys.forEach((key) => {
          pipeline.del(key);
          deleteCount++;
        });
      });

      stream.on("end", async () => {
        if (deleteCount > 0) {
          await pipeline.exec();
          logger.debug("L2 cache pattern invalidated", {
            pattern,
            deleteCount,
          });
        }
      });
    } catch (error) {
      logger.warn("L2 cache pattern invalidation failed", {
        pattern,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Smart cache warming based on access patterns and predictions
   */
  async warmCache(warmingStrategies: CacheWarmingStrategy[]): Promise<void> {
    const warmingPromises: Promise<void>[] = [];

    for (const strategy of warmingStrategies) {
      if (!this.warmingQueue.has(strategy.key)) {
        this.warmingQueue.add(strategy.key);

        warmingPromises.push(
          this.executeWarmingStrategy(strategy).finally(() =>
            this.warmingQueue.delete(strategy.key)
          )
        );
      }
    }

    const results = await Promise.allSettled(warmingPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.info("Cache warming completed", {
      total: warmingStrategies.length,
      successful,
      failed,
      queueSize: this.warmingQueue.size,
    });
  }

  private async executeWarmingStrategy(
    strategy: CacheWarmingStrategy
  ): Promise<void> {
    try {
      const data = await strategy.dataFetcher();

      if (data !== null && data !== undefined) {
        await this.set(strategy.key, data, {
          ttl: strategy.ttl,
          levels: strategy.levels,
        });

        logger.debug("Cache warming successful", {
          key: strategy.key,
          priority: strategy.priority,
        });
      }
    } catch (error) {
      logger.warn("Cache warming failed", {
        key: strategy.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Cache statistics and metrics
   */
  getMetrics(): CacheMetrics {
    const totalL1 = this.metrics.l1.totalRequests;
    const totalL2 = this.metrics.l2.totalRequests;
    const totalL3 = this.metrics.l3.totalRequests;
    const total = totalL1 + totalL2 + totalL3;

    this.metrics.overallHitRate =
      total > 0
        ? (this.metrics.l1.hits + this.metrics.l2.hits + this.metrics.l3.hits) /
          total
        : 0;

    return {
      ...this.metrics,
      l1Size: this.l1Cache.size,
      l2Status: this.l2Cache.status,
      warmingQueueSize: this.warmingQueue.size,
    };
  }

  /**
   * Advanced cache analytics
   */
  async getAdvancedAnalytics(): Promise<CacheAnalytics> {
    const metrics = this.getMetrics();

    return {
      hitRates: {
        l1:
          metrics.l1.totalRequests > 0
            ? metrics.l1.hits / metrics.l1.totalRequests
            : 0,
        l2:
          metrics.l2.totalRequests > 0
            ? metrics.l2.hits / metrics.l2.totalRequests
            : 0,
        l3:
          metrics.l3.totalRequests > 0
            ? metrics.l3.hits / metrics.l3.totalRequests
            : 0,
        overall: metrics.overallHitRate,
      },
      efficiency: {
        memoryUtilization: this.l1Cache.size / this.config.l1.maxSize,
        averageResponseTime: metrics.averageResponseTime,
        warmingEffectiveness: this.calculateWarmingEffectiveness(),
      },
      recommendations: this.generateOptimizationRecommendations(metrics),
    };
  }

  // Private helper methods
  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const result = await this.l2Cache.get(key);
      if (result) {
        return JSON.parse(result) as T;
      }
      return null;
    } catch (error) {
      logger.warn("L2 cache get error", { key, error });
      return null;
    }
  }

  private setInL1<T>(key: string, value: T, ttl: number): void {
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      ttl,
    };
    this.l1Cache.set(key, entry, { ttl });
  }

  private async setInL2<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.l2Cache.setex(key, Math.floor(ttl / 1000), serialized);
    } catch (error) {
      logger.warn("L2 cache set error", { key, error });
    }
  }

  private async setInAllLevels<T>(key: string, value: T): Promise<void> {
    const ttl = this.config.defaultTtl;
    this.setInL1(key, value, ttl);
    await this.setInL2(key, value, ttl);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(key);
    }
    return key.includes(pattern);
  }

  private registerInvalidationCallback(
    key: string,
    callback: () => void
  ): void {
    if (!this.invalidationCallbacks.has(key)) {
      this.invalidationCallbacks.set(key, []);
    }
    this.invalidationCallbacks.get(key)!.push(callback);
  }

  private executeInvalidationCallbacks(key: string): void {
    const callbacks = this.invalidationCallbacks.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          logger.warn("Invalidation callback error", { key, error });
        }
      });
      this.invalidationCallbacks.delete(key);
    }
  }

  private updateResponseTime(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.logMetrics();
    }, this.config.metricsInterval || 300000); // 5 minutes
  }

  private logMetrics(): void {
    const metrics = this.getMetrics();
    logger.info("Cache metrics", {
      hitRates: {
        l1:
          metrics.l1.totalRequests > 0
            ? ((metrics.l1.hits / metrics.l1.totalRequests) * 100).toFixed(2) +
              "%"
            : "0%",
        l2:
          metrics.l2.totalRequests > 0
            ? ((metrics.l2.hits / metrics.l2.totalRequests) * 100).toFixed(2) +
              "%"
            : "0%",
        overall: (metrics.overallHitRate * 100).toFixed(2) + "%",
      },
      sizes: {
        l1: this.l1Cache.size,
        warmingQueue: this.warmingQueue.size,
      },
      averageResponseTime: Math.round(metrics.averageResponseTime),
    });
  }

  private calculateWarmingEffectiveness(): number {
    // Calculate warming effectiveness based on hit rates after warming
    const recentHitRate = this.metrics.overallHitRate;
    return Math.min(recentHitRate * 100, 100);
  }

  private generateOptimizationRecommendations(metrics: CacheMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.overallHitRate < 0.7) {
      recommendations.push(
        "Consider increasing cache TTL or warming more data"
      );
    }

    if (
      metrics.l1.totalRequests > 0 &&
      metrics.l1.hits / metrics.l1.totalRequests < 0.8
    ) {
      recommendations.push(
        "L1 cache hit rate is low - consider increasing memory allocation"
      );
    }

    if (metrics.averageResponseTime > 50) {
      recommendations.push(
        "Average response time is high - optimize cache access patterns"
      );
    }

    return recommendations;
  }

  /**
   * Cleanup and destroy cache connections
   */
  async destroy(): Promise<void> {
    this.l1Cache.clear();
    await this.l2Cache.quit();
    this.warmingQueue.clear();
    this.invalidationCallbacks.clear();
    logger.info("Enhanced multi-level cache destroyed");
  }
}

// Interfaces and types
interface EnhancedCacheConfig {
  l1: {
    maxSize: number;
    ttl: number;
  };
  l2: {
    host: string;
    port: number;
    password?: string;
    database?: number;
    connectTimeout?: number;
    commandTimeout?: number;
  };
  defaultTtl: number;
  metricsInterval?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CacheMetrics {
  l1: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };
  l2: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };
  l3: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };
  overallHitRate: number;
  averageResponseTime: number;
  l1Size?: number;
  l2Status?: string;
  warmingQueueSize?: number;
}

interface CacheSetOptions {
  ttl?: number;
  levels?: ("l1" | "l2")[];
  onInvalidate?: () => void;
}

interface CacheWarmingStrategy {
  key: string;
  dataFetcher: () => Promise<any>;
  priority: "low" | "medium" | "high";
  ttl: number;
  levels: ("l1" | "l2")[];
}

interface CacheAnalytics {
  hitRates: {
    l1: number;
    l2: number;
    l3: number;
    overall: number;
  };
  efficiency: {
    memoryUtilization: number;
    averageResponseTime: number;
    warmingEffectiveness: number;
  };
  recommendations: string[];
}

export { EnhancedCacheConfig, CacheWarmingStrategy, CacheAnalytics };
export default EnhancedMultiLevelCache;
