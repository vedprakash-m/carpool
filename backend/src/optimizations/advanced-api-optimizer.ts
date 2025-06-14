/**
 * Advanced API Performance Enhancement
 * Phase 2: Response compression, request deduplication, pagination optimization, and intelligent caching
 */

import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { v4 as uuidv4 } from "uuid";
import * as zlib from "zlib";
import { promisify } from "util";
import { logger } from "../utils/logger";
import { globalCache } from "../utils/cache";
import { EnhancedMultiLevelCache } from "./enhanced-multi-level-cache";

// Promisify compression functions
const gzip = promisify(zlib.gzip);
const deflate = promisify(zlib.deflate);
const brotliCompress = promisify(zlib.brotliCompress);

/**
 * Advanced response compression with multiple algorithms
 */
export class AdvancedResponseCompression {
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private static readonly BROTLI_THRESHOLD = 10240; // 10KB for brotli
  private static compressionCache = new Map<string, Buffer>();

  /**
   * Intelligently compress response based on content type and size
   */
  static async compressResponse(
    data: any,
    acceptEncoding: string = "",
    contentType: string = "application/json"
  ): Promise<{
    compressed: Buffer | string;
    encoding: string | null;
    compressionRatio: number;
    originalSize: number;
  }> {
    const originalData = typeof data === "string" ? data : JSON.stringify(data);
    const originalSize = Buffer.byteLength(originalData, "utf8");

    // Skip compression for small payloads
    if (originalSize < this.COMPRESSION_THRESHOLD) {
      return {
        compressed: originalData,
        encoding: null,
        compressionRatio: 1,
        originalSize,
      };
    }

    // Generate cache key for identical responses
    const cacheKey = this.generateCompressionCacheKey(originalData);
    const cached = this.compressionCache.get(cacheKey);

    if (cached) {
      return {
        compressed: cached,
        encoding: this.selectBestEncoding(acceptEncoding, originalSize),
        compressionRatio: originalSize / cached.length,
        originalSize,
      };
    }

    try {
      const encoding = this.selectBestEncoding(acceptEncoding, originalSize);
      let compressed: Buffer;

      switch (encoding) {
        case "br":
          compressed = await brotliCompress(originalData, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 6,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: originalSize,
            },
          });
          break;
        case "gzip":
          compressed = await gzip(originalData, { level: 6 });
          break;
        case "deflate":
          compressed = await deflate(originalData, { level: 6 });
          break;
        default:
          return {
            compressed: originalData,
            encoding: null,
            compressionRatio: 1,
            originalSize,
          };
      }

      // Cache compressed result
      this.compressionCache.set(cacheKey, compressed);

      // Prevent memory leak by limiting cache size
      if (this.compressionCache.size > 1000) {
        const firstKey = this.compressionCache.keys().next().value;
        this.compressionCache.delete(firstKey);
      }

      const compressionRatio = originalSize / compressed.length;

      logger.debug("Response compressed", {
        originalSize,
        compressedSize: compressed.length,
        compressionRatio: compressionRatio.toFixed(2),
        encoding,
      });

      return {
        compressed,
        encoding,
        compressionRatio,
        originalSize,
      };
    } catch (error) {
      logger.warn("Compression failed, returning original data", {
        error: error instanceof Error ? error.message : "Unknown error",
        originalSize,
      });

      return {
        compressed: originalData,
        encoding: null,
        compressionRatio: 1,
        originalSize,
      };
    }
  }

  private static selectBestEncoding(
    acceptEncoding: string,
    dataSize: number
  ): string | null {
    const encodings = acceptEncoding
      .toLowerCase()
      .split(",")
      .map((e) => e.trim());

    // Prefer Brotli for larger files (better compression)
    if (dataSize >= this.BROTLI_THRESHOLD && encodings.includes("br")) {
      return "br";
    }

    // Prefer gzip for medium files (good balance of speed/compression)
    if (encodings.includes("gzip")) {
      return "gzip";
    }

    // Fallback to deflate
    if (encodings.includes("deflate")) {
      return "deflate";
    }

    return null;
  }

  private static generateCompressionCacheKey(data: string): string {
    // Simple hash for cache key generation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `comp_${hash}_${data.length}`;
  }
}

/**
 * Advanced request deduplication with intelligent batching
 */
export class AdvancedRequestDeduplicator {
  private static pendingRequests = new Map<string, Promise<any>>();
  private static requestBatches = new Map<string, RequestBatch>();
  private static readonly BATCH_TIMEOUT = 50; // 50ms
  private static readonly MAX_BATCH_SIZE = 10;

  /**
   * Deduplicate identical requests and batch similar ones
   */
  static async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: DeduplicationOptions = {}
  ): Promise<T> {
    const {
      ttl = 5000,
      enableBatching = false,
      batchKey,
      priority = "normal",
    } = options;

    // Check for existing identical request
    if (this.pendingRequests.has(key)) {
      logger.debug("Request deduplicated", { key, priority });
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Handle request batching for similar requests
    if (enableBatching && batchKey) {
      return this.handleBatchedRequest(key, batchKey, requestFn, options);
    }

    // Execute and cache the request
    const promise = this.executeAndCacheRequest(key, requestFn, ttl);
    return promise;
  }

  private static async handleBatchedRequest<T>(
    key: string,
    batchKey: string,
    requestFn: () => Promise<T>,
    options: DeduplicationOptions
  ): Promise<T> {
    if (!this.requestBatches.has(batchKey)) {
      this.requestBatches.set(batchKey, {
        requests: new Map(),
        timeout: setTimeout(() => {
          this.executeBatch(batchKey);
        }, this.BATCH_TIMEOUT),
      });
    }

    const batch = this.requestBatches.get(batchKey)!;

    // Add request to batch
    const promise = new Promise<T>((resolve, reject) => {
      batch.requests.set(key, { requestFn, resolve, reject, options });
    });

    // Execute batch immediately if it reaches max size
    if (batch.requests.size >= this.MAX_BATCH_SIZE) {
      clearTimeout(batch.timeout);
      this.executeBatch(batchKey);
    }

    return promise;
  }

  private static async executeBatch(batchKey: string): Promise<void> {
    const batch = this.requestBatches.get(batchKey);
    if (!batch) return;

    this.requestBatches.delete(batchKey);
    clearTimeout(batch.timeout);

    logger.debug("Executing request batch", {
      batchKey,
      requestCount: batch.requests.size,
    });

    // Execute all requests in the batch concurrently
    const executions = Array.from(batch.requests.entries()).map(
      async ([key, { requestFn, resolve, reject, options }]) => {
        try {
          const result = await this.executeAndCacheRequest(
            key,
            requestFn,
            options.ttl || 5000
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    );

    await Promise.allSettled(executions);
  }

  private static async executeAndCacheRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const promise = requestFn();
    this.pendingRequests.set(key, promise);

    // Clean up after completion
    const cleanup = () => {
      this.pendingRequests.delete(key);
    };

    promise.then(cleanup, cleanup);

    // Set timeout cleanup
    setTimeout(cleanup, ttl);

    return promise;
  }

  /**
   * Get deduplication statistics
   */
  static getStats(): DeduplicationStats {
    return {
      pendingRequests: this.pendingRequests.size,
      activeBatches: this.requestBatches.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private static estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    return this.pendingRequests.size * 1024 + this.requestBatches.size * 512;
  }
}

/**
 * Advanced pagination with intelligent optimization
 */
export class AdvancedPaginationOptimizer {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 100;
  private static readonly MIN_PAGE_SIZE = 1;
  private static paginationCache = new Map<string, PaginationCache>();

  /**
   * Optimize pagination parameters with caching and prefetching
   */
  static optimizePagination(
    query: any,
    options: PaginationOptions = {}
  ): OptimizedPaginationResult {
    const {
      defaultPageSize = this.DEFAULT_PAGE_SIZE,
      maxPageSize = this.MAX_PAGE_SIZE,
      enablePrefetch = true,
      estimatedTotalCount,
    } = options;

    const page = Math.max(parseInt(query.page) || 1, 1);
    let limit = parseInt(query.limit) || defaultPageSize;

    // Enforce limits
    limit = Math.max(this.MIN_PAGE_SIZE, Math.min(maxPageSize, limit));

    const offset = (page - 1) * limit;
    const cacheKey = this.generatePaginationCacheKey(query, page, limit);

    // Check for cached pagination data
    const cached = this.paginationCache.get(cacheKey);
    const shouldPrefetch =
      enablePrefetch &&
      this.shouldPrefetchNextPage(page, limit, estimatedTotalCount);

    return {
      page,
      limit,
      offset,
      cacheKey,
      cached: cached?.data || null,
      shouldPrefetch,
      prefetchPages: shouldPrefetch
        ? this.calculatePrefetchPages(page, estimatedTotalCount, limit)
        : [],
      optimization: this.analyzePaginationOptimization(
        page,
        limit,
        estimatedTotalCount
      ),
    };
  }

  /**
   * Create optimized paginated response with metadata
   */
  static createPaginatedResponse<T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number,
    options: PaginationResponseOptions = {}
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: PaginatedResponse<T> = {
      data,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null,
        firstPage: 1,
        lastPage: totalPages,
        offset: (page - 1) * limit,
      },
      metadata: {
        resultCount: data.length,
        pageEfficiency: data.length / limit,
        estimatedResponseTime: this.estimateResponseTime(data.length),
        cacheability: this.assessCacheability(page, totalPages),
        ...(options.additionalMeta || {}),
      },
    };

    // Cache successful pagination result
    if (data.length > 0) {
      this.cachePaginationResult(page, limit, response, options.cacheTtl);
    }

    return response;
  }

  private static shouldPrefetchNextPage(
    currentPage: number,
    limit: number,
    estimatedTotal?: number
  ): boolean {
    // Don't prefetch if we're likely on the last few pages
    if (estimatedTotal) {
      const estimatedTotalPages = Math.ceil(estimatedTotal / limit);
      return currentPage < estimatedTotalPages - 2;
    }

    // Conservative prefetch for first few pages
    return currentPage <= 3;
  }

  private static calculatePrefetchPages(
    currentPage: number,
    estimatedTotal?: number,
    limit: number = this.DEFAULT_PAGE_SIZE
  ): number[] {
    const prefetchPages: number[] = [];

    // Always try to prefetch next page
    prefetchPages.push(currentPage + 1);

    // Prefetch additional pages based on estimated total
    if (estimatedTotal) {
      const totalPages = Math.ceil(estimatedTotal / limit);
      const remainingPages = totalPages - currentPage;

      if (remainingPages > 2 && currentPage <= 2) {
        prefetchPages.push(currentPage + 2);
      }
    }

    return prefetchPages;
  }

  private static analyzePaginationOptimization(
    page: number,
    limit: number,
    estimatedTotal?: number
  ): PaginationOptimization {
    const suggestions: string[] = [];
    let efficiency = "good";

    // Analyze page size efficiency
    if (limit > 50) {
      suggestions.push("Large page size may impact performance");
      efficiency = "moderate";
    }

    if (limit < 10) {
      suggestions.push("Small page size increases API calls");
      efficiency = "moderate";
    }

    // Analyze pagination depth
    if (page > 100) {
      suggestions.push(
        "Deep pagination detected - consider using cursor-based pagination"
      );
      efficiency = "poor";
    }

    // Analyze total size impact
    if (estimatedTotal && estimatedTotal > 10000 && page > 10) {
      suggestions.push(
        "Large dataset with deep pagination - optimize with search filters"
      );
      efficiency = "poor";
    }

    return {
      efficiency: efficiency as "good" | "moderate" | "poor",
      suggestions,
      recommendedPageSize: this.calculateOptimalPageSize(estimatedTotal),
      useCursorPagination:
        page > 50 || (estimatedTotal && estimatedTotal > 5000),
    };
  }

  private static calculateOptimalPageSize(estimatedTotal?: number): number {
    if (!estimatedTotal) return this.DEFAULT_PAGE_SIZE;

    if (estimatedTotal < 100) return 10;
    if (estimatedTotal < 1000) return 20;
    if (estimatedTotal < 10000) return 50;

    return this.MAX_PAGE_SIZE;
  }

  private static generatePaginationCacheKey(
    query: any,
    page: number,
    limit: number
  ): string {
    const queryString = JSON.stringify(query);
    return `pagination:${Buffer.from(queryString).toString(
      "base64"
    )}:${page}:${limit}`;
  }

  private static cachePaginationResult<T>(
    page: number,
    limit: number,
    response: PaginatedResponse<T>,
    ttl: number = 300000 // 5 minutes
  ): void {
    const cacheKey = `page_${page}_${limit}`;
    this.paginationCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up old cache entries
    this.cleanupPaginationCache();
  }

  private static cleanupPaginationCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.paginationCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.paginationCache.delete(key));
  }

  private static estimateResponseTime(resultCount: number): number {
    // Rough estimation based on result count
    return Math.max(50, resultCount * 2); // 2ms per result minimum 50ms
  }

  private static assessCacheability(
    page: number,
    totalPages: number
  ): "high" | "medium" | "low" {
    if (page <= 3) return "high"; // First few pages are highly cacheable
    if (page <= totalPages * 0.2) return "medium"; // Early pages are moderately cacheable
    return "low"; // Later pages are less cacheable
  }
}

/**
 * Enhanced response caching with intelligent strategies
 */
export class EnhancedResponseCache {
  private static multiLevelCache: EnhancedMultiLevelCache;
  private static cacheStrategies = new Map<string, CacheStrategy>();

  static initialize(multiLevelCache: EnhancedMultiLevelCache): void {
    this.multiLevelCache = multiLevelCache;
  }

  /**
   * Get cached response with intelligent fallback and warming
   */
  static async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    strategy: CacheStrategy
  ): Promise<T> {
    this.cacheStrategies.set(key, strategy);

    const result = await this.multiLevelCache.get(key, async () => {
      const data = await fn();

      // Trigger cache warming for related data if specified
      if (strategy.warmRelated) {
        setImmediate(() => this.warmRelatedData(key, data, strategy));
      }

      return data;
    });

    return result as T;
  }

  private static async warmRelatedData<T>(
    key: string,
    data: T,
    strategy: CacheStrategy
  ): Promise<void> {
    if (!strategy.warmRelated) return;

    try {
      const relatedKeys = strategy.warmRelated(key, data);

      for (const relatedKey of relatedKeys) {
        // Check if related data is already cached
        const cached = await this.multiLevelCache.get(relatedKey);
        if (!cached && strategy.relatedDataFetcher) {
          const relatedData = await strategy.relatedDataFetcher(relatedKey);
          if (relatedData) {
            await this.multiLevelCache.set(relatedKey, relatedData, {
              ttl: strategy.ttl,
              levels: strategy.levels,
            });
          }
        }
      }
    } catch (error) {
      logger.warn("Related data warming failed", {
        originalKey: key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

// Interfaces and types
interface DeduplicationOptions {
  ttl?: number;
  enableBatching?: boolean;
  batchKey?: string;
  priority?: "low" | "normal" | "high";
}

interface RequestBatch {
  requests: Map<
    string,
    {
      requestFn: () => Promise<any>;
      resolve: (value: any) => void;
      reject: (error: any) => void;
      options: DeduplicationOptions;
    }
  >;
  timeout: NodeJS.Timeout;
}

interface DeduplicationStats {
  pendingRequests: number;
  activeBatches: number;
  memoryUsage: number;
}

interface PaginationOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
  enablePrefetch?: boolean;
  estimatedTotalCount?: number;
}

interface OptimizedPaginationResult {
  page: number;
  limit: number;
  offset: number;
  cacheKey: string;
  cached: any;
  shouldPrefetch: boolean;
  prefetchPages: number[];
  optimization: PaginationOptimization;
}

interface PaginationOptimization {
  efficiency: "good" | "moderate" | "poor";
  suggestions: string[];
  recommendedPageSize: number;
  useCursorPagination: boolean;
}

interface PaginationResponseOptions {
  additionalMeta?: Record<string, any>;
  cacheTtl?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
    firstPage: number;
    lastPage: number;
    offset: number;
  };
  metadata: {
    resultCount: number;
    pageEfficiency: number;
    estimatedResponseTime: number;
    cacheability: "high" | "medium" | "low";
    [key: string]: any;
  };
}

interface PaginationCache {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CacheStrategy {
  ttl: number;
  levels: ("l1" | "l2")[];
  warmRelated?: (key: string, data: any) => string[];
  relatedDataFetcher?: (relatedKey: string) => Promise<any>;
}

export {
  DeduplicationOptions,
  PaginationOptions,
  OptimizedPaginationResult,
  PaginatedResponse,
  CacheStrategy,
};

export default {
  AdvancedResponseCompression,
  AdvancedRequestDeduplicator,
  AdvancedPaginationOptimizer,
  EnhancedResponseCache,
};
