/**
 * Phase 2 Performance Optimization Middleware
 * Automatic optimization middleware for Azure Functions
 */

import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Phase2PerformanceOrchestrator } from "../optimizations/phase2-orchestrator";
import { logger } from "../utils/logger";

export interface OptimizationConfig {
  enableCaching?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  enablePagination?: boolean;
  cacheConfig?: {
    ttl?: number;
    levels?: ("l1" | "l2")[];
  };
  compressionThreshold?: number; // Minimum response size to compress
  excludeRoutes?: string[]; // Routes to exclude from optimization
}

export interface OptimizedHandler {
  (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
}

// Global orchestrator instance (singleton pattern for efficiency)
let globalOrchestrator: Phase2PerformanceOrchestrator | null = null;
let isGlobalOrchestratorInitialized = false;

/**
 * Initialize the global orchestrator
 */
async function initializeGlobalOrchestrator(): Promise<void> {
  if (isGlobalOrchestratorInitialized) return;

  const config = {
    database: {
      maxConnections: parseInt(process.env.PHASE2_DB_MAX_CONNECTIONS || "50"),
      minConnections: parseInt(process.env.PHASE2_DB_MIN_CONNECTIONS || "10"),
    },
    cache: {
      l1: {
        maxSize: parseInt(process.env.PHASE2_L1_CACHE_SIZE || "10000"),
        ttl: parseInt(process.env.PHASE2_L1_CACHE_TTL || "300000"), // 5 minutes
      },
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DATABASE || "0"),
      },
      defaultTtl: parseInt(process.env.PHASE2_DEFAULT_TTL || "600000"), // 10 minutes
    },
    cdn: {
      enabled: process.env.PHASE2_CDN_ENABLED === "true",
      storageAccount: process.env.AZURE_STORAGE_ACCOUNT || "",
      storageKey: process.env.AZURE_STORAGE_KEY || "",
      endpoint: process.env.CDN_ENDPOINT || "",
      containerName: process.env.CDN_CONTAINER || "assets",
    },
  };

  globalOrchestrator = new Phase2PerformanceOrchestrator(config);
  await globalOrchestrator.initialize();
  isGlobalOrchestratorInitialized = true;

  logger.info("Global Phase 2 Performance Orchestrator initialized");
}

/**
 * Create an optimized handler wrapper
 */
export function withPhase2Optimizations(
  handler: OptimizedHandler,
  config: OptimizationConfig = {}
): OptimizedHandler {
  const {
    enableCaching = true,
    enableCompression = true,
    enableDeduplication = true,
    enablePagination = true,
    cacheConfig = { ttl: 300000, levels: ["l1", "l2"] },
    compressionThreshold = 1024, // 1KB minimum for compression
    excludeRoutes = [],
  } = config;

  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const startTime = Date.now();
    const functionName = context.functionName;
    const url = new URL(request.url);
    const route = url.pathname;

    // Check if this route should be excluded from optimization
    if (excludeRoutes.some((excludeRoute) => route.includes(excludeRoute))) {
      logger.info(
        `[${functionName}] Route excluded from Phase 2 optimizations`,
        { route }
      );
      return await handler(request, context);
    }

    try {
      // Initialize global orchestrator if needed
      await initializeGlobalOrchestrator();

      if (!globalOrchestrator) {
        logger.warn(
          `[${functionName}] Phase 2 orchestrator not available, falling back to original handler`
        );
        return await handler(request, context);
      }

      // Generate cache key for GET requests if caching is enabled
      let cacheKey: string | null = null;
      let cachedResponse: any = null;

      if (enableCaching && request.method === "GET") {
        cacheKey = generateCacheKey(request, functionName);

        try {
          cachedResponse = await globalOrchestrator["multiLevelCache"]?.get(
            cacheKey
          );
          if (cachedResponse) {
            logger.info(`[${functionName}] Serving cached response`, {
              cacheKey,
            });

            return {
              ...cachedResponse,
              headers: {
                ...cachedResponse.headers,
                "X-Cache-Status": "hit",
                "X-Phase2-Optimized": "true",
                "X-Response-Time": (Date.now() - startTime).toString(),
              },
            };
          }
        } catch (cacheError) {
          logger.warn(`[${functionName}] Cache retrieval failed`, {
            error: cacheError,
          });
        }
      }

      // Execute the original handler
      const originalResponse = await handler(request, context);

      // Apply Phase 2 optimizations to the response
      let optimizedResponse = originalResponse;
      const optimizations: string[] = [];

      if (originalResponse.jsonBody) {
        try {
          const apiOptimizationResult =
            await globalOrchestrator.optimizeAPIResponse(
              {
                method: request.method,
                url: request.url,
                query: Object.fromEntries(url.searchParams.entries()),
                headers: Object.fromEntries(request.headers.entries()),
              },
              originalResponse.jsonBody,
              {
                enableCompression:
                  enableCompression &&
                  shouldCompress(originalResponse, compressionThreshold),
                enableDeduplication,
                enablePagination,
                cacheStrategy: enableCaching ? cacheConfig : undefined,
              }
            );

          optimizedResponse = {
            ...originalResponse,
            jsonBody: apiOptimizationResult.optimizedData,
          };

          optimizations.push(...apiOptimizationResult.optimizations);

          logger.info(`[${functionName}] Phase 2 optimizations applied`, {
            optimizations: optimizations.length,
            dataSizeReduction:
              apiOptimizationResult.performanceMetrics.dataSizeReduction,
            estimatedImprovement:
              apiOptimizationResult.performanceMetrics
                .estimatedResponseTimeImprovement,
          });
        } catch (optimizationError) {
          logger.warn(
            `[${functionName}] Phase 2 optimization failed, using original response`,
            {
              error: optimizationError,
            }
          );
          // Fall back to original response if optimization fails
        }
      }

      // Cache the optimized response for GET requests
      if (
        enableCaching &&
        cacheKey &&
        request.method === "GET" &&
        optimizedResponse.status === 200
      ) {
        try {
          await globalOrchestrator["multiLevelCache"]?.set(
            cacheKey,
            optimizedResponse,
            cacheConfig
          );
          logger.debug(`[${functionName}] Response cached`, { cacheKey });
        } catch (cacheError) {
          logger.warn(`[${functionName}] Response caching failed`, {
            error: cacheError,
          });
        }
      }

      const duration = Date.now() - startTime;

      // Add optimization metadata to headers
      const finalResponse = {
        ...optimizedResponse,
        headers: {
          ...optimizedResponse.headers,
          "X-Phase2-Optimized": "true",
          "X-Cache-Status": cachedResponse ? "hit" : "miss",
          "X-Optimizations": optimizations.join(","),
          "X-Response-Time": duration.toString(),
          "X-Function-Name": functionName,
        },
      };

      // Add metadata to JSON response if it exists
      if (
        finalResponse.jsonBody &&
        typeof finalResponse.jsonBody === "object"
      ) {
        finalResponse.jsonBody = {
          ...finalResponse.jsonBody,
          _phase2Metadata: {
            optimized: true,
            optimizations,
            duration,
            cacheStatus: cachedResponse ? "hit" : "miss",
            timestamp: new Date().toISOString(),
          },
        };
      }

      logger.info(
        `[${functionName}] Request completed with Phase 2 optimizations`,
        {
          duration,
          optimizations: optimizations.length,
          cacheStatus: cachedResponse ? "hit" : "miss",
        }
      );

      return finalResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[${functionName}] Phase 2 optimization middleware error`, {
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });

      // Fall back to original handler if middleware fails
      try {
        return await handler(request, context);
      } catch (handlerError) {
        logger.error(`[${functionName}] Original handler also failed`, {
          error:
            handlerError instanceof Error
              ? handlerError.message
              : "Unknown error",
        });
        throw handlerError;
      }
    }
  };
}

/**
 * Generate a cache key for the request
 */
function generateCacheKey(request: HttpRequest, functionName: string): string {
  const url = new URL(request.url);
  const queryParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const authHeader = request.headers.get("authorization");
  const userContext = authHeader ? authHeader.substring(0, 20) : "anonymous"; // Hash or short identifier

  return `${functionName}:${url.pathname}:${queryParams}:${userContext}`;
}

/**
 * Determine if response should be compressed
 */
function shouldCompress(
  response: HttpResponseInit,
  threshold: number
): boolean {
  if (!response.jsonBody) return false;

  const responseSize = JSON.stringify(response.jsonBody).length;
  return responseSize >= threshold;
}

/**
 * Get Phase 2 optimization metrics
 */
export async function getPhase2Metrics(): Promise<any> {
  if (!globalOrchestrator) {
    return { error: "Phase 2 orchestrator not initialized" };
  }

  try {
    return await globalOrchestrator.getPerformanceMetrics();
  } catch (error) {
    logger.error("Failed to get Phase 2 metrics", { error });
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Manually clear cache
 */
export async function clearPhase2Cache(pattern?: string): Promise<boolean> {
  if (!globalOrchestrator) {
    return false;
  }

  try {
    // If pattern is provided, clear specific keys; otherwise clear all
    if (pattern) {
      // Implementation would depend on the cache implementation
      logger.info("Clearing cache with pattern", { pattern });
    } else {
      await globalOrchestrator["multiLevelCache"]?.clear();
      logger.info("Cleared all Phase 2 cache");
    }
    return true;
  } catch (error) {
    logger.error("Failed to clear Phase 2 cache", { error });
    return false;
  }
}

export { globalOrchestrator };
