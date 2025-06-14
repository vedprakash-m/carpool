/**
 * Phase 2 Advanced Performance Optimization Demo Function
 * Demonstrates comprehensive performance optimizations in a real Azure Function
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Phase2PerformanceOrchestrator } from "../../optimizations/phase2-orchestrator";
import { logger } from "../../utils/logger";
import { cosmosClient } from "../../config/cosmos";

// Initialize Phase 2 orchestrator with production-ready configuration
const phase2Config = {
  database: {
    maxConnections: 50,
    minConnections: 10,
  },
  cache: {
    l1: {
      maxSize: 10000,
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
    enabled: process.env.CDN_ENABLED === "true",
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT || "",
    storageKey: process.env.AZURE_STORAGE_KEY || "",
    endpoint: process.env.CDN_ENDPOINT || "",
    containerName: process.env.CDN_CONTAINER || "assets",
  },
};

const orchestrator = new Phase2PerformanceOrchestrator(phase2Config);
let isOrchstratorInitialized = false;

/**
 * Demo function showcasing Phase 2 optimizations
 */
async function phase2Demo(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // Initialize orchestrator if not already done
    if (!isOrchstratorInitialized) {
      await orchestrator.initialize();
      isOrchstratorInitialized = true;
      logger.info(
        "Phase 2 Performance Orchestrator initialized in Azure Function"
      );
    }

    const { operation } = request.query;
    const requestBody = await request.text();
    const body = requestBody ? JSON.parse(requestBody) : {};

    switch (operation) {
      case "database-optimization":
        return await handleDatabaseOptimization(request, body);

      case "api-optimization":
        return await handleAPIOptimization(request, body);

      case "cdn-optimization":
        return await handleCDNOptimization(request, body);

      case "performance-metrics":
        return await handlePerformanceMetrics();

      case "comprehensive-demo":
        return await handleComprehensiveDemo(request, body);

      default:
        return {
          status: 400,
          jsonBody: {
            error:
              "Invalid operation. Supported: database-optimization, api-optimization, cdn-optimization, performance-metrics, comprehensive-demo",
          },
        };
    }
  } catch (error) {
    logger.error("Phase 2 demo function error", {
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
 * Database optimization demonstration
 */
async function handleDatabaseOptimization(
  request: HttpRequest,
  body: any
): Promise<HttpResponseInit> {
  try {
    const container = cosmosClient.database("vcarpool").container("trips");
    const queryPatterns = body.queryPatterns || [
      "SELECT * FROM c WHERE c.userId = @userId",
      "SELECT * FROM c WHERE c.status = @status ORDER BY c.createdAt DESC",
      "SELECT * FROM c WHERE c.schoolId = @schoolId AND c.date >= @startDate",
    ];

    const optimizationResult = await orchestrator.optimizeDatabaseOperations(
      container,
      queryPatterns
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        operation: "database-optimization",
        result: optimizationResult,
        message: "Database operations optimized successfully",
      },
    };
  } catch (error) {
    logger.error("Database optimization failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500,
      jsonBody: {
        error: "Database optimization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * API optimization demonstration
 */
async function handleAPIOptimization(
  request: HttpRequest,
  body: any
): Promise<HttpResponseInit> {
  try {
    // Mock response data for demonstration
    const mockResponseData = {
      trips: Array.from({ length: 50 }, (_, i) => ({
        id: `trip-${i}`,
        title: `Trip ${i + 1}`,
        description: `This is a sample trip description for trip ${i + 1}`,
        userId: `user-${Math.floor(i / 5)}`,
        status: i % 3 === 0 ? "active" : i % 3 === 1 ? "completed" : "pending",
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        participants: Math.floor(Math.random() * 6) + 1,
      })),
      pagination: {
        total: 500,
        page: parseInt(request.query.get("page") || "1"),
        limit: parseInt(request.query.get("limit") || "20"),
        totalPages: 25,
      },
    };

    const optimizationOptions = {
      enableCompression: true,
      enableDeduplication: true,
      enablePagination: true,
      cacheStrategy: {
        ttl: 300000, // 5 minutes
        levels: ["l1", "l2"] as ("l1" | "l2")[],
      },
    };

    const optimizedResponse = await orchestrator.optimizeAPIResponse(
      request,
      mockResponseData,
      optimizationOptions
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        operation: "api-optimization",
        result: optimizedResponse,
        message: "API response optimized successfully",
      },
    };
  } catch (error) {
    logger.error("API optimization failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500,
      jsonBody: {
        error: "API optimization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * CDN optimization demonstration
 */
async function handleCDNOptimization(
  request: HttpRequest,
  body: any
): Promise<HttpResponseInit> {
  try {
    // Mock static assets for demonstration
    const mockAssets = [
      {
        path: "images/vcarpool-logo.png",
        content: Buffer.from("mock-image-content-png"),
        type: "image" as const,
        critical: true,
        generateResponsive: true,
        responsiveSizes: [480, 768, 1024, 1440],
      },
      {
        path: "css/main.css",
        content: Buffer.from(
          "body { margin: 0; padding: 0; font-family: Arial, sans-serif; }"
        ),
        type: "text" as const,
        critical: true,
        cacheControl: "public, max-age=31536000",
      },
      {
        path: "js/app.js",
        content: Buffer.from('console.log("VCarpool app initialized");'),
        type: "text" as const,
        critical: true,
        cacheControl: "public, max-age=31536000",
      },
    ];

    const optimizationResult = await orchestrator.optimizeStaticAssets(
      mockAssets
    );

    return {
      status: 200,
      jsonBody: {
        success: true,
        operation: "cdn-optimization",
        result: optimizationResult,
        message: "Static assets optimized and uploaded to CDN successfully",
      },
    };
  } catch (error) {
    logger.error("CDN optimization failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500,
      jsonBody: {
        error: "CDN optimization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Performance metrics demonstration
 */
async function handlePerformanceMetrics(): Promise<HttpResponseInit> {
  try {
    const performanceMetrics = await orchestrator.getPerformanceMetrics();

    return {
      status: 200,
      jsonBody: {
        success: true,
        operation: "performance-metrics",
        metrics: performanceMetrics,
        message: "Performance metrics retrieved successfully",
      },
    };
  } catch (error) {
    logger.error("Performance metrics retrieval failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500,
      jsonBody: {
        error: "Performance metrics retrieval failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Comprehensive demo showcasing all optimizations
 */
async function handleComprehensiveDemo(
  request: HttpRequest,
  body: any
): Promise<HttpResponseInit> {
  const demoStartTime = Date.now();
  const results: any = {};

  try {
    logger.info("Starting comprehensive Phase 2 optimization demo");

    // 1. Database optimization
    try {
      const container = cosmosClient.database("vcarpool").container("trips");
      const queryPatterns = [
        "SELECT * FROM c WHERE c.userId = @userId",
        "SELECT * FROM c WHERE c.status = @status",
        "SELECT * FROM c WHERE c.schoolId = @schoolId AND c.date >= @startDate",
      ];

      results.databaseOptimization =
        await orchestrator.optimizeDatabaseOperations(container, queryPatterns);
    } catch (error) {
      results.databaseOptimization = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // 2. API optimization
    try {
      const mockData = {
        trips: Array.from({ length: 20 }, (_, i) => ({
          id: `trip-${i}`,
          title: `Sample Trip ${i + 1}`,
          status: ["active", "completed", "pending"][i % 3],
        })),
        total: 100,
      };

      results.apiOptimization = await orchestrator.optimizeAPIResponse(
        request,
        mockData,
        {
          enableCompression: true,
          enableDeduplication: true,
          enablePagination: true,
          cacheStrategy: { ttl: 300000, levels: ["l1", "l2"] },
        }
      );
    } catch (error) {
      results.apiOptimization = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // 3. CDN optimization (if enabled)
    if (phase2Config.cdn.enabled) {
      try {
        const mockAssets = [
          {
            path: "demo/sample.css",
            content: Buffer.from(".demo { color: blue; }"),
            type: "text" as const,
            critical: true,
          },
        ];

        results.cdnOptimization = await orchestrator.optimizeStaticAssets(
          mockAssets
        );
      } catch (error) {
        results.cdnOptimization = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } else {
      results.cdnOptimization = {
        message: "CDN optimization disabled in configuration",
      };
    }

    // 4. Performance metrics
    try {
      results.performanceMetrics = await orchestrator.getPerformanceMetrics();
    } catch (error) {
      results.performanceMetrics = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const totalDuration = Date.now() - demoStartTime;

    return {
      status: 200,
      jsonBody: {
        success: true,
        operation: "comprehensive-demo",
        results,
        summary: {
          totalDuration,
          optimizationsApplied: Object.keys(results).filter(
            (key) => results[key] && !results[key].error
          ).length,
          timestamp: new Date().toISOString(),
        },
        message:
          "Comprehensive Phase 2 optimization demo completed successfully",
      },
    };
  } catch (error) {
    logger.error("Comprehensive demo failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      status: 500,
      jsonBody: {
        error: "Comprehensive demo failed",
        message: error instanceof Error ? error.message : "Unknown error",
        partialResults: results,
      },
    };
  }
}

// Register the Azure Function
app.http("phase2-demo", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: phase2Demo,
});

export default phase2Demo;
