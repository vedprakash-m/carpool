module.exports = async function (context, req) {
  context.log("Trips list function started");

  // Set CORS headers
  context.res = {
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin":
        "https://lively-stone-016bfa20f.6.azurestaticapps.net",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Content-Type": "application/json",
    },
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res.status = 200;
    context.res.body = "";
    return;
  }

  if (req.method !== "GET") {
    context.res.status = 405;
    context.res.body = JSON.stringify({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    // Mock trip data for now
    const mockTrips = [
      {
        id: "trip1",
        driverId: "user1",
        destination: "Downtown Office",
        date: new Date("2025-01-10"),
        departureTime: "08:00",
        arrivalTime: "08:30",
        maxPassengers: 4,
        passengers: ["user2", "user3"],
        availableSeats: 2,
        cost: 5.5,
        status: "planned",
        notes: "Regular morning commute",
      },
      {
        id: "trip2",
        driverId: "user2",
        destination: "Shopping Mall",
        date: new Date("2025-01-12"),
        departureTime: "14:00",
        arrivalTime: "14:20",
        maxPassengers: 3,
        passengers: [],
        availableSeats: 3,
        cost: 3.0,
        status: "planned",
        notes: "Weekend shopping trip",
      },
    ];

    context.res.status = 200;
    context.res.body = JSON.stringify({
      success: true,
      data: mockTrips,
    });
  } catch (error) {
    context.log.error("Error in trips list:", error);
    context.res.status = 500;
    context.res.body = JSON.stringify({
      success: false,
      error: "Internal server error",
    });
  }
};
