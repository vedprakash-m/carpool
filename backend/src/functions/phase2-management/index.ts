/**
 * Phase 2 Optimization Management Function
 * Provides endpoints for monitoring, controlling, and analyzing Phase 2 optimizations
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  getPhase2Metrics,
  clearPhase2Cache,
  globalOrchestrator,
} from "../../middleware/phase2-optimization.middleware";
import { logger } from "../../utils/logger";

async function phase2ManagementHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "status";
    const adminKey = request.headers.get("x-admin-key");

    // Basic admin authentication check
    if (action !== "status" && adminKey !== process.env.PHASE2_ADMIN_KEY) {
      return {
        status: 401,
        jsonBody: {
          error: "Unauthorized",
          message: "Valid admin key required for management operations",
        },
      };
    }

    switch (action) {
      case "status":
        return await handleStatusRequest();

      case "metrics":
        return await handleMetricsRequest();

      case "clear-cache":
        return await handleClearCacheRequest(request);

      case "health-check":
        return await handleHealthCheckRequest();

      case "recommendations":
        return await handleRecommendationsRequest();

      case "config":
        return await handleConfigRequest();

      default:
        return {
          status: 400,
          jsonBody: {
            error: "Invalid action",
            message:
              "Supported actions: status, metrics, clear-cache, health-check, recommendations, config",
          },
        };
    }
  } catch (error) {
    logger.error("Phase 2 management function error", {
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    });

    return {
      status: 500,
      jsonBody: {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Get basic status of Phase 2 optimizations
 */
async function handleStatusRequest(): Promise<HttpResponseInit> {
  try {
    const isInitialized = globalOrchestrator !== null;

    return {
      status: 200,
      jsonBody: {
        success: true,
        phase2Status: {
          initialized: isInitialized,
          timestamp: new Date().toISOString(),
          version: "2.0.0",
          features: {
            advancedDatabaseOptimization: true,
            enhancedMultiLevelCaching: true,
            advancedAPIOptimization: true,
            cdnIntegration: process.env.PHASE2_CDN_ENABLED === "true",
            performanceOrchestration: true,
          },
        },
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Failed to get Phase 2 status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Get comprehensive performance metrics
 */
async function handleMetricsRequest(): Promise<HttpResponseInit> {
  try {
    const metrics = await getPhase2Metrics();

    if (metrics.error) {
      return {
        status: 503,
        jsonBody: {
          error: "Metrics unavailable",
          message: metrics.error,
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        metrics,
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Failed to get Phase 2 metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Clear cache with optional pattern
 */
async function handleClearCacheRequest(
  request: HttpRequest
): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const pattern = url.searchParams.get("pattern");

    const success = await clearPhase2Cache(pattern || undefined);

    if (!success) {
      return {
        status: 503,
        jsonBody: {
          error: "Cache clear failed",
          message: "Phase 2 cache system is not available",
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: pattern
          ? `Cache cleared for pattern: ${pattern}`
          : "All Phase 2 cache cleared",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Failed to clear cache",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Comprehensive health check
 */
async function handleHealthCheckRequest(): Promise<HttpResponseInit> {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        orchestrator: {
          status: globalOrchestrator ? "healthy" : "unhealthy",
          initialized: globalOrchestrator !== null,
        },
        cache: {
          status: "unknown",
          l1: "unknown",
          l2: "unknown",
        },
        database: {
          status: "unknown",
          connectionPools: 0,
        },
        cdn: {
          status:
            process.env.PHASE2_CDN_ENABLED === "true" ? "enabled" : "disabled",
        },
      },
    };

    // Test cache if available
    if (globalOrchestrator) {
      try {
        const metrics = await globalOrchestrator.getPerformanceMetrics();
        health.checks.cache.status = "healthy";
        health.checks.cache.l1 = "healthy";
        health.checks.cache.l2 = metrics.cache?.multiLevel
          ? "healthy"
          : "unknown";
        health.checks.database.connectionPools =
          metrics.database?.connectionPoolsActive || 0;
        health.checks.database.status = "healthy";
      } catch (error) {
        health.checks.cache.status = "unhealthy";
        health.status = "degraded";
      }
    } else {
      health.status = "unhealthy";
    }

    return {
      status: health.status === "healthy" ? 200 : 503,
      jsonBody: {
        success: health.status !== "unhealthy",
        health,
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Get performance recommendations
 */
async function handleRecommendationsRequest(): Promise<HttpResponseInit> {
  try {
    const metrics = await getPhase2Metrics();

    if (metrics.error) {
      return {
        status: 503,
        jsonBody: {
          error: "Recommendations unavailable",
          message: "Cannot generate recommendations without metrics",
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        success: true,
        recommendations: metrics.recommendations || [],
        generatedAt: new Date().toISOString(),
        basedOnMetrics: {
          phase: metrics.phase,
          timestamp: metrics.timestamp,
        },
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Failed to get recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Get current configuration
 */
async function handleConfigRequest(): Promise<HttpResponseInit> {
  try {
    const config = {
      database: {
        maxConnections: process.env.PHASE2_DB_MAX_CONNECTIONS || "50",
        minConnections: process.env.PHASE2_DB_MIN_CONNECTIONS || "10",
      },
      cache: {
        l1: {
          maxSize: process.env.PHASE2_L1_CACHE_SIZE || "10000",
          ttl: process.env.PHASE2_L1_CACHE_TTL || "300000",
        },
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || "6379",
          database: process.env.REDIS_DATABASE || "0",
        },
        defaultTtl: process.env.PHASE2_DEFAULT_TTL || "600000",
      },
      cdn: {
        enabled: process.env.PHASE2_CDN_ENABLED === "true",
        endpoint: process.env.CDN_ENDPOINT || "",
        container: process.env.CDN_CONTAINER || "assets",
      },
      features: {
        compressionEnabled: true,
        deduplicationEnabled: true,
        paginationOptimization: true,
        intelligentCaching: true,
      },
    };

    return {
      status: 200,
      jsonBody: {
        success: true,
        config,
        environment: process.env.NODE_ENV || "development",
      },
    };
  } catch (error) {
    return {
      status: 500,
      jsonBody: {
        error: "Failed to get configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

app.http("phase2-management", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "admin/phase2",
  handler: phase2ManagementHandler,
});

export default phase2ManagementHandler;
