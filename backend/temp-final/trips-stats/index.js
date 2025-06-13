const UnifiedResponseHandler = require("../../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Trips stats function started");
  context.log("Request method:", req.method);

  // Handle preflight requests
  const preflightResponse = UnifiedResponseHandler.handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  try {
    // Validate authorization
    const authError = UnifiedResponseHandler.validateAuth(req);
    if (authError) {
      context.res = authError;
      return;
    }
    // Return mock stats data for the dashboard
    // In a real app, this would query the database
    const stats = {
      totalTrips: 8,
      tripsAsDriver: 5,
      tripsAsPassenger: 3,
      totalDistance: 1250,
      milesSaved: 750, // 60% of total distance saved through carpooling
      upcomingTrips: 2,
    };

    context.log("Returning stats:", stats);

    context.res = UnifiedResponseHandler.success(stats);
  } catch (error) {
    context.log("Stats error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Error retrieving trip statistics",
      error.message
    );
  }
};
