const UnifiedResponseHandler = require("../../src/utils/unified-response.service");

module.exports = function (context, req) {
  context.log("Health check function triggered");

  // Handle preflight requests
  const preflightResponse = UnifiedResponseHandler.handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  context.res = UnifiedResponseHandler.success({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: "production",
  });

  context.done();
};
