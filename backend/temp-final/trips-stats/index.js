module.exports = async function (context, req) {
  context.log("Trips stats function started");
  context.log("Request method:", req.method);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
    };
    return;
  }

  try {
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

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: {
        success: true,
        data: stats,
      },
    };
  } catch (error) {
    context.log("Stats error:", error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: {
        success: false,
        error: error.message,
      },
    };
  }
};
