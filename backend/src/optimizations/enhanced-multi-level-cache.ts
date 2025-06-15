/**
 * Enhanced Multi-Level Cache
 * In-memory only implementation for cost efficiency
 */

import { logger } from "../utils/logger";
import { MemoryCache } from "../utils/cache";

export interface CacheLevel {
  name: string;
  priority: number;
  ttl: number;
  maxSize: number;
}

export interface CachePattern {
  pattern: string | RegExp;
  ttl: number;
  priority: "low" | "medium" | "high";
  warningThreshold?: number;
}

export interface CacheMetrics {
  level: string;
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface CacheAnalytics {
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
  levelMetrics: CacheMetrics[];
  topKeys: Array<{ key: string; accessCount: number }>;
  memoryUsage: number;
}

/**
 * Enhanced Multi-Level Cache with intelligent management
 * Note: In-memory only to avoid Redis costs
 */
export class EnhancedMultiLevelCache {
  private l1Cache: MemoryCache; // Primary memory cache
  private l2Cache: MemoryCache; // Secondary memory cache with longer TTL
  private l3Cache: MemoryCache; // Tertiary cache for long-term storage
  private cachePatterns: CachePattern[] = [];
  private warmingQueue: Set<string> = new Set();
  private initialized = false;

  constructor() {
    // L1: Fast, short-lived cache
    this.l1Cache = new MemoryCache({
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 30 * 1000, // 30 seconds
      enableMetrics: true,
    });

    // L2: Medium-term cache
    this.l2Cache = new MemoryCache({
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      maxSize: 5000,
      cleanupInterval: 2 * 60 * 1000, // 2 minutes
      enableMetrics: true,
    });

    // L3: Long-term cache
    this.l3Cache = new MemoryCache({
      defaultTtl: 2 * 60 * 60 * 1000, // 2 hours
      maxSize: 10000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true,
    });
  }

  /**
   * Initialize the cache system
   */
  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Enhanced Multi-Level Cache");

      // Setup default cache patterns
      this.setupDefaultPatterns();

      // Setup cache warming strategies
      this.setupCacheWarming();

      this.initialized = true;
      logger.info("Enhanced Multi-Level Cache initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Enhanced Multi-Level Cache", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get value from cache (tries all levels)
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Try L1 first (fastest)
    let value = this.l1Cache.get(key);
    if (value !== null) {
      logger.debug("Cache hit L1", { key });
      this.promoteToL1(key, value);
      return value as T;
    }

    // Try L2
    value = this.l2Cache.get(key);
    if (value !== null) {
      logger.debug("Cache hit L2", { key });
      this.promoteToL1(key, value);
      return value as T;
    }

    // Try L3
    value = this.l3Cache.get(key);
    if (value !== null) {
      logger.debug("Cache hit L3", { key });
      this.promoteToL2(key, value);
      this.promoteToL1(key, value);
      return value as T;
    }

    logger.debug("Cache miss", { key });
    return null;
  }

  /**
   * Set value in appropriate cache level
   */
  async set<T>(key: string, value: T, options?: { ttl?: number; level?: "l1" | "l2" | "l3" }): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const pattern = this.findMatchingPattern(key);
    const ttl = options?.ttl || pattern?.ttl || this.getDefaultTtl(pattern?.priority || "medium");
    const level = options?.level || this.determineOptimalLevel(key, pattern);

    switch (level) {
      case "l1":
        this.l1Cache.set(key, value, ttl);
        break;
      case "l2":
        this.l2Cache.set(key, value, ttl);
        break;
      case "l3":
        this.l3Cache.set(key, value, ttl);
        break;
      default:
        // Default to L1
        this.l1Cache.set(key, value, ttl);
    }

    logger.debug("Cache set", { key, level, ttl });
  }

  /**
   * Delete from all cache levels
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    this.l2Cache.delete(key);
    this.l3Cache.delete(key);
    logger.debug("Cache delete", { key });
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    logger.info("All cache levels cleared");
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    logger.info("Starting cache warming", { keyCount: keys.length });

    for (const key of keys) {
      if (this.warmingQueue.has(key)) {
        continue; // Already warming
      }

      this.warmingQueue.add(key);

      try {
        const existingValue = await this.get(key);
        if (existingValue === null) {
          const value = await fetcher(key);
          if (value !== null && value !== undefined) {
            await this.set(key, value);
            logger.debug("Cache warmed", { key });
          }
        }
      } catch (error) {
        logger.warn("Cache warming failed for key", {
          key,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        this.warmingQueue.delete(key);
      }
    }

    logger.info("Cache warming completed");
  }

  /**
   * Add cache pattern for intelligent caching
   */
  addCachePattern(pattern: CachePattern): void {
    this.cachePatterns.push(pattern);
    logger.debug("Cache pattern added", { pattern: pattern.pattern.toString() });
  }

  /**
   * Get comprehensive cache analytics
   */
  getAnalytics(): CacheAnalytics {
    const l1Metrics = this.l1Cache.getMetrics();
    const l2Metrics = this.l2Cache.getMetrics();
    const l3Metrics = this.l3Cache.getMetrics();

    const totalHits = l1Metrics.hits + l2Metrics.hits + l3Metrics.hits;
    const totalMisses = l1Metrics.misses + l2Metrics.misses + l3Metrics.misses;
    const overallHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    const levelMetrics: CacheMetrics[] = [
      {
        level: "L1",
        hits: l1Metrics.hits,
        misses: l1Metrics.misses,
        evictions: l1Metrics.evictions,
        size: l1Metrics.currentSize,
        hitRate: l1Metrics.hitRate,
      },
      {
        level: "L2",
        hits: l2Metrics.hits,
        misses: l2Metrics.misses,
        evictions: l2Metrics.evictions,
        size: l2Metrics.currentSize,
        hitRate: l2Metrics.hitRate,
      },
      {
        level: "L3",
        hits: l3Metrics.hits,
        misses: l3Metrics.misses,
        evictions: l3Metrics.evictions,
        size: l3Metrics.currentSize,
        hitRate: l3Metrics.hitRate,
      },
    ];

    // Calculate memory usage (simplified)
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    // Get top keys (simplified - would need more sophisticated tracking in production)
    const topKeys: Array<{ key: string; accessCount: number }> = [];

    return {
      totalHits,
      totalMisses,
      overallHitRate,
      levelMetrics,
      topKeys,
      memoryUsage,
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: "healthy" | "warning" | "critical";
    details: Record<string, any>;
  } {
    const analytics = this.getAnalytics();
    const totalSize = analytics.levelMetrics.reduce((sum, level) => sum + level.size, 0);

    let status: "healthy" | "warning" | "critical" = "healthy";

    if (analytics.memoryUsage > 1000) { // > 1GB
      status = "critical";
    } else if (analytics.memoryUsage > 500 || analytics.overallHitRate < 0.5) { // > 500MB or < 50% hit rate
      status = "warning";
    }

    return {
      status,
      details: {
        initialized: this.initialized,
        totalCacheSize: totalSize,
        overallHitRate: analytics.overallHitRate,
        memoryUsageMB: analytics.memoryUsage,
        warmingQueueSize: this.warmingQueue.size,
      },
    };
  }

  /**
   * Promote value to L1 cache
   */
  private promoteToL1<T>(key: string, value: T): void {
    this.l1Cache.set(key, value);
  }

  /**
   * Promote value to L2 cache
   */
  private promoteToL2<T>(key: string, value: T): void {
    this.l2Cache.set(key, value);
  }

  /**
   * Find matching cache pattern
   */
  private findMatchingPattern(key: string): CachePattern | null {
    for (const pattern of this.cachePatterns) {
      if (typeof pattern.pattern === "string") {
        if (key.includes(pattern.pattern)) {
          return pattern;
        }
      } else if (pattern.pattern instanceof RegExp) {
        if (pattern.pattern.test(key)) {
          return pattern;
        }
      }
    }
    return null;
  }

  /**
   * Determine optimal cache level for key
   */
  private determineOptimalLevel(key: string, pattern?: CachePattern | null): "l1" | "l2" | "l3" {
    if (pattern) {
      switch (pattern.priority) {
        case "high":
          return "l1";
        case "medium":
          return "l2";
        case "low":
          return "l3";
      }
    }

    // Default logic based on key patterns
    if (key.includes("user:") || key.includes("session:")) {
      return "l1"; // User data needs fast access
    } else if (key.includes("query:") || key.includes("search:")) {
      return "l2"; // Query results are moderately important
    } else {
      return "l3"; // Everything else goes to long-term storage
    }
  }

  /**
   * Get default TTL based on priority
   */
  private getDefaultTtl(priority: "low" | "medium" | "high"): number {
    switch (priority) {
      case "high":
        return 5 * 60 * 1000; // 5 minutes
      case "medium":
        return 30 * 60 * 1000; // 30 minutes
      case "low":
        return 2 * 60 * 60 * 1000; // 2 hours
      default:
        return 15 * 60 * 1000; // 15 minutes
    }
  }

  /**
   * Setup default cache patterns
   */
  private setupDefaultPatterns(): void {
    // High-priority patterns (L1 cache)
    this.addCachePattern({
      pattern: /^user:/,
      ttl: 5 * 60 * 1000,
      priority: "high",
    });

    this.addCachePattern({
      pattern: /^session:/,
      ttl: 10 * 60 * 1000,
      priority: "high",
    });

    // Medium-priority patterns (L2 cache)
    this.addCachePattern({
      pattern: /^query:/,
      ttl: 30 * 60 * 1000,
      priority: "medium",
    });

    this.addCachePattern({
      pattern: /^api:/,
      ttl: 15 * 60 * 1000,
      priority: "medium",
    });

    // Low-priority patterns (L3 cache)
    this.addCachePattern({
      pattern: /^static:/,
      ttl: 2 * 60 * 60 * 1000,
      priority: "low",
    });

    this.addCachePattern({
      pattern: /^config:/,
      ttl: 60 * 60 * 1000,
      priority: "low",
    });
  }

  /**
   * Setup cache warming strategies
   */
  private setupCacheWarming(): void {
    // Implement basic warming strategies
    logger.debug("Cache warming strategies initialized");
  }
}

// Global enhanced cache instance
let globalEnhancedCache: EnhancedMultiLevelCache | null = null;

/**
 * Get or create global enhanced cache instance
 */
export async function getGlobalEnhancedCache(): Promise<EnhancedMultiLevelCache> {
  if (!globalEnhancedCache) {
    globalEnhancedCache = new EnhancedMultiLevelCache();
    await globalEnhancedCache.initialize();
  }
  return globalEnhancedCache;
}
