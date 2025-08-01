// Simple CORS headers without requiring the middleware
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

// Simple response handler
const createResponse = (statusCode, body, headers = {}) => ({
  status: statusCode,
  headers: { ...corsHeaders, ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

module.exports = async function (context, req) {
  context.log("Trips stats function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = createResponse(200, "", {
        "Content-Type": "text/plain"
      });
      return;
    }

    // Extract user from JWT token (if provided)
    let userId = null;
    let userRole = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        // Check if this is a valid JWT token (starts with eyJ for base64 encoded header)
        if (token.startsWith("eyJ")) {
          // This is a real JWT token from login - user has authenticated
          try {
            // Decode the payload (not validating signature for now)
            const payload = JSON.parse(atob(token.split(".")[1]));
            userId = payload.userId || payload.sub;
            userRole = payload.role;
            context.log("Authenticated user detected:", { userId, userRole });
          } catch (decodeError) {
            context.log("JWT decode error:", decodeError.message);
          }
        } else if (token.includes("parent") || token.includes("admin")) {
          // Fallback for test tokens
          userId = "test-user";
          userRole = token.includes("admin") ? "admin" : "parent";
        }
      } catch (tokenError) {
        context.log("Token verification failed:", tokenError.message);
      }
    }

    // Return statistics based on actual user authentication and group membership
    // New users should get zero stats until they join carpool groups
    let stats;

    if (userId && userRole) {
      // For authenticated users, check if they have joined any carpool groups
      // In a real implementation, this would query the database for user's group memberships
      // For now, return zero stats for new users to trigger proper onboarding flow
      stats = {
        totalTrips: 0,
        tripsAsDriver: 0,
        tripsAsPassenger: 0,
        totalDistance: 0,
        milesSaved: 0,
        upcomingTrips: 0,
        weeklySchoolTrips: 0,
        childrenCount: 0,
        timeSavedHours: 0,
      };

      context.log(
        "Returning zero stats for authenticated user to trigger onboarding"
      );
    } else {
      // Return zero stats for unauthenticated users
      stats = {
        totalTrips: 0,
        tripsAsDriver: 0,
        tripsAsPassenger: 0,
        totalDistance: 0,
        milesSaved: 0,
        upcomingTrips: 0,
        weeklySchoolTrips: 0,
        childrenCount: 0,
        timeSavedHours: 0,
      };

      context.log("Returning zero stats for unauthenticated user");
    }

    context.log("Returning stats:", stats);

    context.res = createResponse(200, {
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      }
    }, {
      "Content-Type": "application/json"
    });
  } catch (error) {
    context.log("Stats error:", error);
    context.res = createResponse(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred",
        statusCode: 500
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    }, {
      "Content-Type": "application/json"
    });
  }
};
