/**
 * Health check function - essential for CI/CD pipelines and monitoring
 * Uses traditional Azure Functions pattern for compatibility
 */
module.exports = async function (context, req) {
  context.log(`Health check called via ${req.method}`);

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

  context.res = {
    status: 200,
    body: healthInfo,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  };
};
