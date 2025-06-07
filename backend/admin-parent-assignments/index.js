const { CosmosClient } = require("@azure/cosmos");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

module.exports = async function (context, req) {
  context.log("Parent Assignments API called");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: "",
    };
    return;
  }

  try {
    const { weekStartDate } = req.params;
    const method = req.method;

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        status: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization token",
          },
        }),
      };
    }

    // TODO: Verify parent role from JWT token
    const token = authHeader.split(" ")[1];

    // Initialize Cosmos DB (use environment variables or fallback to mock)
    let assignmentsContainer = null;
    let usersContainer = null;

    if (process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY) {
      const cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
      });
      const database = cosmosClient.database("vcarpool");
      assignmentsContainer = database.container("rideAssignments");
      usersContainer = database.container("users");
    }

    // Set current week as default if no week specified
    const targetWeek = weekStartDate || getCurrentMondayDate();

    switch (method) {
      case "GET":
        return await getParentAssignments(
          assignmentsContainer,
          usersContainer,
          targetWeek,
          context
        );
      default:
        return {
          status: 405,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${method} not allowed`,
            },
          }),
        };
    }
  } catch (error) {
    context.log.error("Parent assignments error:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          details: error.message,
        },
      }),
    };
  }
};

// Get parent assignments for a specific week
async function getParentAssignments(
  assignmentsContainer,
  usersContainer,
  weekStartDate,
  context
) {
  try {
    // Validate week start date format
    if (!weekStartDate || !isValidDate(weekStartDate)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid week start date format. Expected YYYY-MM-DD.",
          },
        }),
      };
    }

    if (assignmentsContainer && usersContainer) {
      // Get assignments from Cosmos DB
      const { resources: assignments } = await assignmentsContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.weekStartDate = @weekStartDate",
          parameters: [{ name: "@weekStartDate", value: weekStartDate }],
        })
        .fetchAll();

      // Get user details for contact information
      const { resources: users } = await usersContainer.items
        .query(
          "SELECT c.id, c.firstName, c.lastName, c.email, c.phoneNumber FROM c WHERE c.role = 'parent'"
        )
        .fetchAll();

      // Enhance assignments with contact information
      const enhancedAssignments = assignments.map((assignment) => {
        const driver = users.find((u) => u.id === assignment.driverId);
        const passengers =
          assignment.passengerIds
            ?.map((passengerId) => {
              const passenger = users.find((u) => u.id === passengerId);
              return passenger
                ? {
                    id: passenger.id,
                    name: `${passenger.firstName} ${passenger.lastName}`,
                    phoneNumber: passenger.phoneNumber,
                  }
                : null;
            })
            .filter(Boolean) || [];

        return {
          ...assignment,
          driverName: driver
            ? `${driver.firstName} ${driver.lastName}`
            : "Unknown Driver",
          driverContact: {
            email: driver?.email,
            phoneNumber: driver?.phoneNumber,
          },
          passengers,
          passengerCount: passengers.length,
        };
      });

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            weekStartDate,
            assignments: enhancedAssignments,
            totalAssignments: enhancedAssignments.length,
          },
        }),
      };
    } else {
      // Return mock assignments for development
      const mockAssignments = getMockParentAssignments(weekStartDate);
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: mockAssignments,
        }),
      };
    }
  } catch (error) {
    context.log.error("Get parent assignments error:", error);
    throw error;
  }
}

// Helper function to get current Monday date
function getCurrentMondayDate() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  return monday.toISOString().split("T")[0];
}

// Helper function to validate date format
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Mock data for development and testing
function getMockParentAssignments(weekStartDate) {
  return {
    weekStartDate,
    assignments: [
      {
        id: "assignment-1",
        templateSlotId: "template-monday-morning-dropoff",
        date: "2025-01-06",
        dayOfWeek: 1,
        startTime: "07:30",
        endTime: "08:30",
        routeType: "school_dropoff",
        description: "Monday Morning School Drop-off",
        driverId: "parent-1",
        driverName: "Sarah Johnson",
        driverContact: {
          email: "sarah.johnson@email.com",
          phoneNumber: "555-0123",
        },
        passengerIds: ["child-1", "child-2", "child-3"],
        passengers: [
          {
            id: "child-1",
            name: "Emma Wilson",
            phoneNumber: "555-0126",
          },
          {
            id: "child-2",
            name: "Lucas Chen",
            phoneNumber: "555-0124",
          },
          {
            id: "child-3",
            name: "Sophie Davis",
            phoneNumber: "555-0125",
          },
        ],
        passengerCount: 3,
        pickupLocation: "123 Maple Street",
        dropoffLocation: "Lincoln Elementary School",
        status: "confirmed",
        assignmentMethod: "automatic",
        createdAt: "2025-01-03T10:00:00.000Z",
        updatedAt: "2025-01-03T10:00:00.000Z",
      },
      {
        id: "assignment-2",
        templateSlotId: "template-wednesday-afternoon-pickup",
        date: "2025-01-08",
        dayOfWeek: 3,
        startTime: "15:00",
        endTime: "16:00",
        routeType: "school_pickup",
        description: "Wednesday Afternoon School Pick-up",
        driverId: "parent-1",
        driverName: "Sarah Johnson",
        driverContact: {
          email: "sarah.johnson@email.com",
          phoneNumber: "555-0123",
        },
        passengerIds: ["child-4", "child-5"],
        passengers: [
          {
            id: "child-4",
            name: "Alex Thompson",
            phoneNumber: "555-0127",
          },
          {
            id: "child-5",
            name: "Maya Patel",
            phoneNumber: "555-0128",
          },
        ],
        passengerCount: 2,
        pickupLocation: "Lincoln Elementary School",
        dropoffLocation: "456 Oak Avenue",
        status: "confirmed",
        assignmentMethod: "automatic",
        createdAt: "2025-01-03T10:00:00.000Z",
        updatedAt: "2025-01-03T10:00:00.000Z",
      },
      {
        id: "assignment-3",
        templateSlotId: "template-friday-morning-dropoff",
        date: "2025-01-10",
        dayOfWeek: 5,
        startTime: "07:30",
        endTime: "08:30",
        routeType: "school_dropoff",
        description: "Friday Morning School Drop-off",
        driverId: "parent-1",
        driverName: "Sarah Johnson",
        driverContact: {
          email: "sarah.johnson@email.com",
          phoneNumber: "555-0123",
        },
        passengerIds: ["child-6"],
        passengers: [
          {
            id: "child-6",
            name: "Ryan Martinez",
            phoneNumber: "555-0129",
          },
        ],
        passengerCount: 1,
        pickupLocation: "123 Maple Street",
        dropoffLocation: "Lincoln Elementary School",
        status: "confirmed",
        assignmentMethod: "automatic",
        createdAt: "2025-01-03T10:00:00.000Z",
        updatedAt: "2025-01-03T10:00:00.000Z",
      },
    ],
    totalAssignments: 3,
    weekSummary: {
      totalTrips: 3,
      totalPassengers: 6,
      dropoffTrips: 2,
      pickupTrips: 1,
      estimatedDrivingTime: "3 hours",
    },
  };
}
