/**
 * Advanced Database Query Optimization
 * Phase 2: Enhanced indexing strategies, query performance tuning, and connection pooling
 */

import {
  Container,
  SqlQuerySpec,
  FeedOptions,
  IndexingPolicy,
  PartitionKeyDefinition,
} from "@azure/cosmos";
import { logger } from "../utils/logger";
import { globalCache, CacheKeyGenerator } from "../utils/cache";
import { MultiLevelCache } from "./multi-level-cache";

/**
 * Advanced indexing strategies for optimal query performance
 */
export class AdvancedIndexingOptimizer {
  /**
   * Generate optimized indexing policy based on query patterns
   */
  static generateIndexingPolicy(queryPatterns: string[]): IndexingPolicy {
    const includedPaths: { path: string; indexes?: any[] }[] = [];
    const excludedPaths: { path: string }[] = [];

    // Analyze query patterns to determine optimal indexes
    const fields = new Set<string>();
    queryPatterns.forEach((query) => {
      const matches = query.match(/c\.(\w+)/g);
      if (matches) {
        matches.forEach((match) => fields.add(match.replace("c.", "")));
      }
    });

    // Create composite indexes for frequently queried fields
    fields.forEach((field) => {
      includedPaths.push({
        path: `/${field}/?`,
        indexes: [
          { kind: "Range", dataType: "String", precision: -1 },
          { kind: "Range", dataType: "Number", precision: -1 },
        ],
      });
    });

    // Exclude unused paths to reduce index overhead
    excludedPaths.push({ path: "/metadata/*" });
    excludedPaths.push({ path: "/debug/*" });

    return {
      indexingMode: "consistent",
      automatic: true,
      includedPaths,
      excludedPaths,
      compositeIndexes: [
        // Common composite indexes for carpool queries
        [
          { path: "/origin", order: "ascending" },
          { path: "/destination", order: "ascending" },
          { path: "/departureTime", order: "ascending" },
        ],
        [
          { path: "/userId", order: "ascending" },
          { path: "/status", order: "ascending" },
          { path: "/createdAt", order: "descending" },
        ],
      ],
    };
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  static analyzeQueryPerformance(
    query: string,
    requestCharge: number,
    executionTime: number,
    resultCount: number
  ): {
    isOptimal: boolean;
    suggestions: string[];
    severity: "low" | "medium" | "high";
  } {
    const suggestions: string[] = [];
    let severity: "low" | "medium" | "high" = "low";

    // High RU consumption analysis
    if (requestCharge > 50) {
      suggestions.push(
        "Consider adding composite indexes for multi-field queries"
      );
      suggestions.push(
        "Optimize WHERE clauses to use partition key when possible"
      );
      severity = "high";
    }

    // Slow execution time analysis
    if (executionTime > 2000) {
      suggestions.push("Query execution time is high - consider pagination");
      suggestions.push("Use SELECT specific fields instead of SELECT *");
      severity =
        Math.max(severity === "high" ? 2 : severity === "medium" ? 1 : 0, 1) ===
        2
          ? "high"
          : "medium";
    }

    // Cross-partition query detection
    if (query.includes("SELECT") && !query.includes("WHERE c.partitionKey")) {
      suggestions.push(
        "Cross-partition query detected - consider partitioning strategy"
      );
      severity =
        Math.max(severity === "high" ? 2 : severity === "medium" ? 1 : 0, 1) ===
        2
          ? "high"
          : "medium";
    }

    // Low result efficiency
    const ruPerResult =
      resultCount > 0 ? requestCharge / resultCount : requestCharge;
    if (ruPerResult > 5) {
      suggestions.push(
        "High RU cost per result - optimize filtering and projection"
      );
      severity =
        Math.max(severity === "high" ? 2 : severity === "medium" ? 1 : 0, 1) ===
        2
          ? "high"
          : "medium";
    }

    return {
      isOptimal: suggestions.length === 0,
      suggestions,
      severity,
    };
  }

  /**
   * Generate optimized partition key strategy
   */
  static optimizePartitionKey(
    entityType: string,
    accessPatterns: string[]
  ): PartitionKeyDefinition {
    const commonPartitionStrategies = {
      user: { paths: ["/userId"], kind: "Hash" as const },
      trip: { paths: ["/route"], kind: "Hash" as const },
      notification: { paths: ["/userId"], kind: "Hash" as const },
      message: { paths: ["/tripId"], kind: "Hash" as const },
    };

    return (
      commonPartitionStrategies[
        entityType as keyof typeof commonPartitionStrategies
      ] || { paths: ["/id"], kind: "Hash" as const }
    );
  }
}

/**
 * Advanced connection pooling with intelligent load balancing
 */
export class AdvancedConnectionPooling {
  private static pools = new Map<string, ConnectionPool>();

  static createPool(
    endpoint: string,
    options: ConnectionPoolOptions
  ): ConnectionPool {
    const poolId = this.generatePoolId(endpoint, options);

    if (!this.pools.has(poolId)) {
      const pool = new ConnectionPool(endpoint, options);
      this.pools.set(poolId, pool);
      logger.info("Created new connection pool", { poolId, endpoint });
    }

    return this.pools.get(poolId)!;
  }

  private static generatePoolId(
    endpoint: string,
    options: ConnectionPoolOptions
  ): string {
    return `${endpoint}-${JSON.stringify(options)}`;
  }

  /**
   * Get optimal connection from pool with load balancing
   */
  static async getOptimalConnection(poolId: string): Promise<any> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Connection pool ${poolId} not found`);
    }

    return pool.getConnection();
  }
}

interface ConnectionPoolOptions {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  enableHealthCheck: boolean;
}

class ConnectionPool {
  private connections: any[] = [];
  private activeConnections = 0;
  private readonly endpoint: string;
  private readonly options: ConnectionPoolOptions;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(endpoint: string, options: ConnectionPoolOptions) {
    this.endpoint = endpoint;
    this.options = options;

    if (options.enableHealthCheck) {
      this.startHealthCheck();
    }

    // Pre-create minimum connections
    this.initializeMinConnections();
  }

  private async initializeMinConnections(): Promise<void> {
    for (let i = 0; i < this.options.minConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.connections.push(connection);
      } catch (error) {
        logger.warn("Failed to create initial connection", { error });
      }
    }
  }

  private async createConnection(): Promise<any> {
    // Simulate connection creation
    return {
      id: `conn-${Date.now()}-${Math.random()}`,
      created: Date.now(),
      lastUsed: Date.now(),
      healthy: true,
    };
  }

  async getConnection(): Promise<any> {
    if (this.connections.length > 0) {
      const connection = this.connections.pop()!;
      this.activeConnections++;
      connection.lastUsed = Date.now();
      return connection;
    }

    if (this.activeConnections < this.options.maxConnections) {
      const connection = await this.createConnection();
      this.activeConnections++;
      return connection;
    }

    throw new Error("Connection pool exhausted");
  }

  releaseConnection(connection: any): void {
    connection.lastUsed = Date.now();
    this.connections.push(connection);
    this.activeConnections--;
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.reapIntervalMillis);
  }

  private performHealthCheck(): void {
    const now = Date.now();

    // Remove idle connections
    this.connections = this.connections.filter((conn) => {
      const isIdle = now - conn.lastUsed > this.options.idleTimeoutMillis;
      if (isIdle) {
        logger.debug("Removing idle connection", { connectionId: conn.id });
      }
      return !isIdle;
    });
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.connections = [];
    this.activeConnections = 0;
  }
}

/**
 * Query performance tuning with intelligent optimization
 */
export class QueryPerformanceTuner {
  private static queryMetrics = new Map<string, QueryMetrics[]>();

  /**
   * Analyze and optimize query based on historical performance
   */
  static async optimizeQuery(
    container: Container,
    originalQuery: SqlQuerySpec,
    partitionKey?: string
  ): Promise<{
    optimizedQuery: SqlQuerySpec;
    estimatedImprovement: number;
    optimizations: string[];
  }> {
    const querySignature = this.generateQuerySignature(originalQuery);
    const metrics = this.queryMetrics.get(querySignature) || [];

    const optimizations: string[] = [];
    let optimizedQuery = { ...originalQuery };
    let estimatedImprovement = 0;

    // Optimize SELECT clause
    if (originalQuery.query.includes("SELECT *")) {
      optimizations.push("Replace SELECT * with specific fields");
      estimatedImprovement += 15; // 15% improvement estimate
    }

    // Optimize WHERE clause ordering
    const whereOptimization = this.optimizeWhereClause(
      originalQuery.query,
      partitionKey
    );
    if (whereOptimization.optimized) {
      optimizedQuery.query = whereOptimization.query;
      optimizations.push("Reordered WHERE clause for optimal index usage");
      estimatedImprovement += whereOptimization.improvement;
    }

    // Add ORDER BY optimization
    const orderOptimization = this.optimizeOrderBy(originalQuery.query);
    if (orderOptimization.optimized) {
      optimizedQuery.query = orderOptimization.query;
      optimizations.push("Optimized ORDER BY for index alignment");
      estimatedImprovement += orderOptimization.improvement;
    }

    // Add pagination recommendation
    if (
      !originalQuery.query.includes("OFFSET") &&
      !originalQuery.query.includes("TOP")
    ) {
      optimizations.push(
        "Consider adding pagination (TOP/OFFSET) for large result sets"
      );
      estimatedImprovement += 10;
    }

    return {
      optimizedQuery,
      estimatedImprovement: Math.min(estimatedImprovement, 50), // Cap at 50%
      optimizations,
    };
  }

  /**
   * Record query performance metrics for analysis
   */
  static recordQueryMetrics(
    query: SqlQuerySpec,
    metrics: {
      requestCharge: number;
      executionTime: number;
      resultCount: number;
      partitionKey?: string;
    }
  ): void {
    const signature = this.generateQuerySignature(query);
    const queryMetrics = this.queryMetrics.get(signature) || [];

    queryMetrics.push({
      timestamp: Date.now(),
      requestCharge: metrics.requestCharge,
      executionTime: metrics.executionTime,
      resultCount: metrics.resultCount,
      partitionKey: metrics.partitionKey,
    });

    // Keep only last 100 metrics per query
    if (queryMetrics.length > 100) {
      queryMetrics.splice(0, queryMetrics.length - 100);
    }

    this.queryMetrics.set(signature, queryMetrics);
  }

  private static generateQuerySignature(query: SqlQuerySpec): string {
    // Normalize query for signature generation
    const normalizedQuery = query.query
      .replace(/\s+/g, " ")
      .replace(/'/g, '"')
      .toLowerCase()
      .trim();

    return Buffer.from(normalizedQuery).toString("base64").substring(0, 32);
  }

  private static optimizeWhereClause(
    query: string,
    partitionKey?: string
  ): { optimized: boolean; query: string; improvement: number } {
    if (!partitionKey || !query.includes("WHERE")) {
      return { optimized: false, query, improvement: 0 };
    }

    // Move partition key condition to the front
    const whereMatch = query.match(
      /WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+OFFSET|\s*$)/i
    );
    if (!whereMatch) {
      return { optimized: false, query, improvement: 0 };
    }

    const whereClause = whereMatch[1];
    const conditions = whereClause.split(/\s+AND\s+/i);

    // Find partition key condition
    const partitionKeyCondition = conditions.find(
      (cond) =>
        cond.includes(partitionKey) || cond.includes(`c.${partitionKey}`)
    );

    if (partitionKeyCondition) {
      // Move partition key condition to front
      const otherConditions = conditions.filter(
        (cond) => cond !== partitionKeyCondition
      );
      const optimizedWhere = [partitionKeyCondition, ...otherConditions].join(
        " AND "
      );

      const optimizedQuery = query.replace(
        /WHERE\s+.+?(?=\s+ORDER\s+BY|\s+OFFSET|\s*$)/i,
        `WHERE ${optimizedWhere}`
      );

      return { optimized: true, query: optimizedQuery, improvement: 20 };
    }

    return { optimized: false, query, improvement: 0 };
  }

  private static optimizeOrderBy(query: string): {
    optimized: boolean;
    query: string;
    improvement: number;
  } {
    // Check if ORDER BY can be optimized with available indexes
    const orderByMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+OFFSET|\s*$)/i);
    if (!orderByMatch) {
      return { optimized: false, query, improvement: 0 };
    }

    const orderByClause = orderByMatch[1];

    // If ordering by timestamp/date fields, suggest DESC for recent-first queries
    if (
      orderByClause.includes("createdAt") ||
      orderByClause.includes("timestamp")
    ) {
      if (!orderByClause.includes("DESC")) {
        const optimizedQuery = query.replace(
          /ORDER\s+BY\s+(.+?)(?:\s+OFFSET|\s*$)/i,
          `ORDER BY ${orderByClause} DESC`
        );
        return { optimized: true, query: optimizedQuery, improvement: 10 };
      }
    }

    return { optimized: false, query, improvement: 0 };
  }
}

interface QueryMetrics {
  timestamp: number;
  requestCharge: number;
  executionTime: number;
  resultCount: number;
  partitionKey?: string;
}

/**
 * Advanced caching strategies with intelligent cache warming
 */
export class AdvancedCacheOptimizer {
  private static multiLevelCache: MultiLevelCache;
  private static warmingQueue = new Set<string>();

  static initialize(config: any): void {
    this.multiLevelCache = new MultiLevelCache(config);
  }

  /**
   * Intelligent cache warming based on access patterns
   */
  static async warmCacheIntelligently(
    container: Container,
    accessPatterns: AccessPattern[]
  ): Promise<void> {
    const warmingPromises: Promise<void>[] = [];

    for (const pattern of accessPatterns) {
      if (!this.warmingQueue.has(pattern.key)) {
        this.warmingQueue.add(pattern.key);

        warmingPromises.push(
          this.warmCacheEntry(container, pattern).finally(() =>
            this.warmingQueue.delete(pattern.key)
          )
        );
      }
    }

    await Promise.allSettled(warmingPromises);
    logger.info("Cache warming completed", {
      patternsProcessed: accessPatterns.length,
      queueSize: this.warmingQueue.size,
    });
  }

  private static async warmCacheEntry(
    container: Container,
    pattern: AccessPattern
  ): Promise<void> {
    try {
      const query: SqlQuerySpec = {
        query: pattern.query,
        parameters: pattern.parameters || [],
      };

      const response = await container.items
        .query(query, {
          maxItemCount: pattern.maxItems || 100,
        })
        .fetchNext();

      if (response.resources) {
        await this.multiLevelCache.set(
          pattern.key,
          response.resources,
          pattern.ttl || 300000 // 5 minutes default
        );

        logger.debug("Cache entry warmed", {
          key: pattern.key,
          itemCount: response.resources.length,
          requestCharge: response.requestCharge,
        });
      }
    } catch (error) {
      logger.warn("Failed to warm cache entry", {
        key: pattern.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Predictive cache pre-loading based on user behavior
   */
  static async predictivePreload(
    userId: string,
    userBehavior: UserBehaviorPattern[]
  ): Promise<void> {
    const predictions = this.generateCachePredictions(userId, userBehavior);

    for (const prediction of predictions) {
      if (prediction.confidence > 0.7) {
        // Only preload high-confidence predictions
        await this.preloadData(prediction);
      }
    }
  }

  private static generateCachePredictions(
    userId: string,
    behavior: UserBehaviorPattern[]
  ): CachePrediction[] {
    const predictions: CachePrediction[] = [];

    // Analyze behavior patterns to predict next likely actions
    const recentActions = behavior
      .filter((b) => Date.now() - b.timestamp < 86400000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentActions.length > 0) {
      const lastAction = recentActions[0];

      // Predict based on action type
      switch (lastAction.action) {
        case "search_trips":
          predictions.push({
            key: `user_trips:${userId}`,
            confidence: 0.8,
            action: "preload_user_trips",
            priority: "high",
          });
          break;
        case "view_trip":
          predictions.push({
            key: `trip_participants:${lastAction.entityId}`,
            confidence: 0.75,
            action: "preload_trip_participants",
            priority: "medium",
          });
          break;
        case "send_message":
          predictions.push({
            key: `trip_messages:${lastAction.entityId}`,
            confidence: 0.9,
            action: "preload_trip_messages",
            priority: "high",
          });
          break;
      }
    }

    return predictions;
  }

  private static async preloadData(prediction: CachePrediction): Promise<void> {
    try {
      logger.debug("Preloading data based on prediction", {
        key: prediction.key,
        confidence: prediction.confidence,
        action: prediction.action,
      });

      // Implementation would depend on specific data types
      // This is a placeholder for actual preloading logic
    } catch (error) {
      logger.warn("Failed to preload predicted data", {
        prediction: prediction.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

interface AccessPattern {
  key: string;
  query: string;
  parameters?: any[];
  frequency: number;
  ttl?: number;
  maxItems?: number;
}

interface UserBehaviorPattern {
  timestamp: number;
  action: string;
  entityId?: string;
  duration?: number;
}

interface CachePrediction {
  key: string;
  confidence: number;
  action: string;
  priority: "low" | "medium" | "high";
}

export default {
  AdvancedIndexingOptimizer,
  AdvancedConnectionPooling,
  QueryPerformanceTuner,
  AdvancedCacheOptimizer,
};
