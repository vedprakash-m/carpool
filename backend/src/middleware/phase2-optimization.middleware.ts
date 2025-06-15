/**
 * Phase 2 Optimization Middleware
 * Provides automatic optimization wrapper for any Azure Function
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { performanceOptimization } from "../utils/api-optimizer";
import { logger } from "../utils/logger";

export interface Phase2OptimizationConfig {
  enableCaching?: boolean;
  enableCompression?: boolean;
  enableDeduplication?: boolean;
  enableMetrics?: boolean;
  enablePagination?: boolean;
  cacheConfig?: {
    ttl?: number;
    levels?: ("l1" | "l2" | "l3")[];
  };
  compressionThreshold?: number;
  excludeRoutes?: string[];
  monitoringLevel?: "basic" | "detailed" | "debug";
}

export interface OptimizedHandler {
  (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
}

const defaultConfig: Phase2OptimizationConfig = {
  enableCaching: true,
  enableCompression: true,
  enableDeduplication: true,
  enableMetrics: true,
  enablePagination: true,
  cacheConfig: {
    ttl: 5 * 60 * 1000, // 5 minutes
    levels: ["l1"], // Only in-memory cache
  },
  compressionThreshold: 512,
  excludeRoutes: [],
  monitoringLevel: "basic",
};

/**
 * Apply Phase 2 optimizations to an Azure Function
 */
export function withPhase2Optimizations(
  handler: OptimizedHandler,
  config: Partial<Phase2OptimizationConfig> = {}
): OptimizedHandler {
  const optimizationConfig = { ...defaultConfig, ...config };

  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const startTime = Date.now();
    const requestId = context.invocationId;
    const endpoint = `${request.method} ${new URL(request.url).pathname}`;

    // Check if route is excluded
    if (optimizationConfig.excludeRoutes?.some(route => endpoint.includes(route))) {
      logger.debug("Route excluded from optimization", { endpoint, requestId });
      return handler(request, context);
    }

    try {
      logger.debug("Applying Phase 2 optimizations", {
        endpoint,
        requestId,
        config: optimizationConfig,
      });

      // Wrap the handler with performance optimizations
      const optimizedHandler = performanceOptimization({
        enableCompression: optimizationConfig.enableCompression,
        enableCaching: optimizationConfig.enableCaching,
        enableDeduplication: optimizationConfig.enableDeduplication,
        enableMetrics: optimizationConfig.enableMetrics,
      });

      // Execute the optimized handler
      const wrappedHandler = optimizedHandler((req) => handler(req, context));
      const response = await wrappedHandler(request);

      const duration = Date.now() - startTime;

      // Add optimization metadata to response
      if (!response.headers) response.headers = {};
      const headers = response.headers as Record<string, string>;
      headers["X-Phase2-Optimized"] = "true";
      headers["X-Optimization-Duration"] = `${duration}ms`;
      headers["X-Request-ID"] = requestId;

      // Log optimization results
      if (optimizationConfig.monitoringLevel === "detailed" || optimizationConfig.monitoringLevel === "debug") {
        logger.info("Phase 2 optimization completed", {
          endpoint,
          requestId,
          duration,
          status: response.status || 200,
          optimizations: {
            caching: optimizationConfig.enableCaching,
            compression: optimizationConfig.enableCompression,
            deduplication: optimizationConfig.enableDeduplication,
            metrics: optimizationConfig.enableMetrics,
          },
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("Phase 2 optimization failed", {
        endpoint,
        requestId,
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Fallback to original handler if optimization fails
      logger.warn("Falling back to original handler", { endpoint, requestId });
      return handler(request, context);
    }
  };
}

/**
 * Quick optimization wrapper with sensible defaults
 */
export function quickOptimize(handler: OptimizedHandler): OptimizedHandler {
  return withPhase2Optimizations(handler, {
    enableCaching: true,
    enableCompression: true,
    enableDeduplication: true,
    enableMetrics: true,
    monitoringLevel: "basic",
  });
}

/**
 * Performance-focused optimization
 */
export function performanceOptimize(handler: OptimizedHandler): OptimizedHandler {
  return withPhase2Optimizations(handler, {
    enableCaching: true,
    enableCompression: true,
    enableDeduplication: true,
    enableMetrics: true,
    enablePagination: true,
    cacheConfig: {
      ttl: 10 * 60 * 1000, // 10 minutes
      levels: ["l1"],
    },
    compressionThreshold: 256,
    monitoringLevel: "detailed",
  });
}

/**
 * Minimal optimization for lightweight functions
 */
export function lightweightOptimize(handler: OptimizedHandler): OptimizedHandler {
  return withPhase2Optimizations(handler, {
    enableCaching: false,
    enableCompression: true,
    enableDeduplication: false,
    enableMetrics: true,
    compressionThreshold: 1024,
    monitoringLevel: "basic",
  });
}
