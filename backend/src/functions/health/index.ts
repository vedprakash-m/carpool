import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

/**
 * Health check function - essential for CI/CD pipelines and monitoring
 * Uses modern Azure Functions v4 programming model
 */
async function healthHandler(
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
    status: 200,
    jsonBody: healthInfo,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: healthHandler,
});
