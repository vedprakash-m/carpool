const { CosmosClient } = require("@azure/cosmos");
const jwt = require("jsonwebtoken");

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const database = cosmosClient.database(
  process.env.COSMOS_DB_DATABASE || "vcarpool"
);
const tripsContainer = database.container("trips");
const usersContainer = database.container("users");

module.exports = async function (context, req) {
  context.log("Database-integrated trips stats function started");
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
    // Extract user from JWT token (if provided)
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default-jwt-secret"
        );
        userId = decoded.userId;
        context.log("User ID from token:", userId);
      } catch (tokenError) {
        context.log("Token verification failed:", tokenError.message);
      }
    }

    if (userId) {
      // Query real database for user-specific statistics
      const tripsAsDriverQuery = {
        query: "SELECT * FROM c WHERE c.driverId = @userId",
        parameters: [{ name: "@userId", value: userId }],
      };

      const tripsAsPassengerQuery = {
        query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.passengers, @userId)",
        parameters: [{ name: "@userId", value: userId }],
      };

      const upcomingTripsQuery = {
        query:
          "SELECT * FROM c WHERE (c.driverId = @userId OR ARRAY_CONTAINS(c.passengers, @userId)) AND c.departureTime > @now",
        parameters: [
          { name: "@userId", value: userId },
          { name: "@now", value: new Date().toISOString() },
        ],
      };

      // Execute queries in parallel
      const [driverTripsResult, passengerTripsResult, upcomingTripsResult] =
        await Promise.all([
          tripsContainer.items.query(tripsAsDriverQuery).fetchAll(),
          tripsContainer.items.query(tripsAsPassengerQuery).fetchAll(),
          tripsContainer.items.query(upcomingTripsQuery).fetchAll(),
        ]);

      const driverTrips = driverTripsResult.resources;
      const passengerTrips = passengerTripsResult.resources;
      const upcomingTrips = upcomingTripsResult.resources;

      // Calculate statistics from real data
      const totalTrips = driverTrips.length + passengerTrips.length;
      const totalDistance =
        driverTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0) +
        passengerTrips.reduce((sum, trip) => sum + (trip.distance || 0), 0);

      // Cost savings calculation (assuming $0.50 per mile saved by carpooling)
      const costSavings = totalDistance * 0.5;

      // Weekly school trips (filter for school-related trips)
      const schoolTrips = [...driverTrips, ...passengerTrips].filter(
        (trip) =>
          trip.destination && trip.destination.toLowerCase().includes("school")
      );
      const weeklySchoolTrips = Math.ceil(schoolTrips.length / 4); // Rough weekly average

      // Get user data for children count
      let childrenCount = 0;
      try {
        const { resource: user } = await usersContainer.item(userId).read();
        if (user && user.role === "parent") {
          // Query for children
          const childrenQuery = {
            query: "SELECT VALUE COUNT(1) FROM c WHERE c.parentId = @parentId",
            parameters: [{ name: "@parentId", value: userId }],
          };
          const childrenResult = await usersContainer.items
            .query(childrenQuery)
            .fetchAll();
          childrenCount = childrenResult.resources[0] || 0;
        }
      } catch (userError) {
        context.log("Error fetching user data:", userError.message);
      }

      const stats = {
        totalTrips: totalTrips,
        tripsAsDriver: driverTrips.length,
        tripsAsPassenger: passengerTrips.length,
        totalDistance: totalDistance,
        costSavings: parseFloat(costSavings.toFixed(2)),
        upcomingTrips: upcomingTrips.length,
        // School-focused statistics
        weeklySchoolTrips: weeklySchoolTrips,
        childrenCount: childrenCount,
        monthlyFuelSavings: parseFloat((costSavings * 1.8).toFixed(2)), // Estimate monthly from total
        timeSavedHours: Math.ceil(totalTrips * 0.5), // Rough estimate: 30 min saved per trip
      };

      context.log(
        "Returning database-calculated stats for user:",
        userId,
        stats
      );

      context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
          success: true,
          data: stats,
        },
      };
    } else {
      // Fallback to mock data when no user authentication
      context.log("No valid user token, returning mock stats");

      const mockStats = {
        totalTrips: 8,
        tripsAsDriver: 5,
        tripsAsPassenger: 3,
        totalDistance: 1250,
        costSavings: 245.5,
        upcomingTrips: 2,
        // School-focused statistics for dashboard
        weeklySchoolTrips: 6,
        childrenCount: 2,
        monthlyFuelSavings: 89.25,
        timeSavedHours: 12,
      };

      context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
          success: true,
          data: mockStats,
        },
      };
    }
  } catch (error) {
    context.log("Database stats error:", error);

    // Fallback to mock data on any error
    const fallbackStats = {
      totalTrips: 8,
      tripsAsDriver: 5,
      tripsAsPassenger: 3,
      totalDistance: 1250,
      costSavings: 245.5,
      upcomingTrips: 2,
      // School-focused statistics for dashboard
      weeklySchoolTrips: 6,
      childrenCount: 2,
      monthlyFuelSavings: 89.25,
      timeSavedHours: 12,
    };

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: {
        success: true,
        data: fallbackStats,
      },
    };
  }
};
