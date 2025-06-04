import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

/**
 * Health check function - essential for CI/CD pipelines and monitoring
 * @param request The HTTP request object
 * @param context The invocation context
 * @returns HTTP response with health status
 */
export default async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Health check called via ${request.method}`);

  // Include basic platform information
  const healthInfo = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.VERSION || "1.0.0",
    platform: {
      node: process.version,
      os: process.platform,
      memory: process.memoryUsage(),
    },
  };

  return {
    jsonBody: healthInfo,
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
}
