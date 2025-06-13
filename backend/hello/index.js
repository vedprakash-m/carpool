const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = function (context, req) {
  context.log("Health check function triggered");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: "production",
    };

    context.res = UnifiedResponseHandler.success(healthData);
    context.done();
  } catch (error) {
    context.log("Health check error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
    context.done();
  }
};
