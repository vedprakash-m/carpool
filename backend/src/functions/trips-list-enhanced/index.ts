/**
 * Enhanced trips-list function with Phase 2 optimizations
 * Demonstrates integration of advanced performance optimizations in a real function
 */

import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import {
  ApiResponse,
  PaginatedResponse,
  Trip,
  TripStatus,
} from "@vcarpool/shared";
import { handleError } from "../../utils/error-handler";
import { Phase2PerformanceOrchestrator } from "../../optimizations/phase2-orchestrator";
import { AdvancedResponseCompression } from "../../optimizations/advanced-api-optimizer";
import { EnhancedMultiLevelCache } from "../../optimizations/enhanced-multi-level-cache";

// Global Phase 2 orchestrator instance
let orchestrator: Phase2PerformanceOrchestrator | null = null;
let isInitialized = false;

/**
 * Initialize Phase 2 optimizations
 */
async function initializeOptimizations(): Promise<void> {
  if (isInitialized) return;

  const config = {
    database: {
      maxConnections: 30,
      minConnections: 5,
    },
    cache: {
      l1: {
        maxSize: 5000,
        ttl: 300000, // 5 minutes
      },
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        database: 0,
      },
      defaultTtl: 600000, // 10 minutes
    },
    cdn: {
      enabled: false, // Disabled for this function
      storageAccount: "",
      storageKey: "",
      endpoint: "",
      containerName: "",
    },
  };

  orchestrator = new Phase2PerformanceOrchestrator(config);
  await orchestrator.initialize();
  isInitialized = true;
}

async function tripsListEnhancedHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // Initialize optimizations if needed
    await initializeOptimizations();

    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info(
      "[trips-list-enhanced] Received optimized request to list trips."
    );

    // Parse query parameters
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");

    const query = {
      page: parseInt(url.searchParams.get("page") || "1"),
      limit: parseInt(url.searchParams.get("limit") || "10"),
      status:
        statusParam &&
        ["planned", "active", "completed", "cancelled"].includes(statusParam)
          ? (statusParam as TripStatus)
          : undefined,
      driverId: url.searchParams.get("driverId") || undefined,
      date: url.searchParams.get("date") || undefined,
    };

    // Generate cache key for this request
    const cacheKey = `trips-list:${JSON.stringify(query)}`;

    // Try to get cached result first
    let response: PaginatedResponse<Trip>;
    let fromCache = false;

    if (orchestrator) {
      try {
        // Check if we have cached data
        const cachedData = await orchestrator["multiLevelCache"]?.get(cacheKey);
        if (cachedData) {
          response = cachedData as PaginatedResponse<Trip>;
          fromCache = true;
          logger.info("[trips-list-enhanced] Serving from cache", { cacheKey });
        }
      } catch (cacheError) {
        logger.warn("[trips-list-enhanced] Cache retrieval failed", {
          error: cacheError,
        });
      }
    }

    // If not in cache, fetch from database
    if (!fromCache) {
      const { trips, total } = await tripService.getTrips(query);

      response = {
        success: true,
        data: trips,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };

      // Cache the result
      if (orchestrator) {
        try {
          await orchestrator["multiLevelCache"]?.set(cacheKey, response, {
            ttl: 300000, // 5 minutes
            levels: ["l1", "l2"],
          });
          logger.info("[trips-list-enhanced] Result cached", { cacheKey });
        } catch (cacheError) {
          logger.warn("[trips-list-enhanced] Cache storage failed", {
            error: cacheError,
          });
        }
      }
    }

    // Apply Phase 2 API optimizations
    let optimizedResponse = response;
    const optimizations: string[] = [];

    if (orchestrator) {
      try {
        const apiOptimizationResult = await orchestrator.optimizeAPIResponse(
          {
            method: "GET",
            url: request.url,
            query: Object.fromEntries(url.searchParams.entries()),
            headers: Object.fromEntries(request.headers.entries()),
          },
          response,
          {
            enableCompression: true,
            enableDeduplication: true,
            enablePagination: true,
            cacheStrategy: {
              ttl: 300000,
              levels: ["l1", "l2"],
            },
          }
        );

        optimizedResponse = apiOptimizationResult.optimizedData;
        optimizations.push(...apiOptimizationResult.optimizations);

        logger.info("[trips-list-enhanced] API optimizations applied", {
          optimizations: optimizations.length,
          dataSizeReduction:
            apiOptimizationResult.performanceMetrics.dataSizeReduction,
          compressionApplied: apiOptimizationResult.compressionApplied,
        });
      } catch (optimizationError) {
        logger.warn("[trips-list-enhanced] API optimization failed", {
          error: optimizationError,
        });
        // Fallback to original response if optimization fails
        optimizedResponse = response;
      }
    }

    const duration = Date.now() - startTime;

    // Add performance metadata to response
    const finalResponse = {
      ...optimizedResponse,
      _metadata: {
        fromCache,
        duration,
        optimizations,
        phase2Enabled: true,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info("[trips-list-enhanced] Request completed", {
      duration,
      fromCache,
      optimizations: optimizations.length,
      tripCount: response.data.length,
    });

    return {
      status: 200,
      jsonBody: finalResponse,
      headers: {
        "X-Performance-Optimized": "true",
        "X-Cache-Status": fromCache ? "hit" : "miss",
        "X-Optimizations": optimizations.join(","),
        "X-Response-Time": duration.toString(),
      },
    };
  } catch (error) {
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    const duration = Date.now() - startTime;
    logger.error(`[trips-list-enhanced] Error listing trips: ${error}`, {
      error,
      duration,
    });

    return handleError(error, request);
  }
}

app.http("trips-list-enhanced", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "trips/enhanced",
  handler: tripsListEnhancedHandler,
});

export default tripsListEnhancedHandler;
