const { CosmosClient } = require("@azure/cosmos");
const { MockDataFactory } = require("../src/utils/mock-data-wrapper");
const {
  handlePreflight,
  createSuccessResponse,
  createErrorResponse,
  validateAuth,
  handleError,
  isValidDate,
  getCurrentMondayDate,
  logRequest,
} = require("../src/utils/unified-response");

module.exports = async function (context, req) {
  context.log("Parent Assignments API called");
  logRequest(req, context, "admin-parent-assignments");

  // Handle preflight requests
  const preflightResponse = handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  try {
    const { weekStartDate } = req.params;
    const method = req.method;

    // Validate authorization
    const authError = validateAuth(req);
    if (authError) {
      context.res = authError;
      return;
    }

    // TODO: Verify parent role from JWT token
    const token = req.headers.authorization.split(" ")[1];

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
        const result = await getParentAssignments(
          assignmentsContainer,
          usersContainer,
          targetWeek,
          context
        );
        context.res = result;
        return;
      default:
        context.res = createErrorResponse(
          "METHOD_NOT_ALLOWED",
          `Method ${method} not allowed`,
          405
        );
        return;
    }
  } catch (error) {
    context.res = handleError(
      error,
      context,
      "Failed to process parent assignments"
    );
  }
};

async function getParentAssignments(
  assignmentsContainer,
  usersContainer,
  weekStartDate,
  context
) {
  try {
    // Validate week start date format
    if (!weekStartDate || !isValidDate(weekStartDate)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid week start date format. Expected YYYY-MM-DD.",
        400
      );
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

      return createSuccessResponse({
        weekStartDate,
        assignments: enhancedAssignments,
        totalAssignments: enhancedAssignments.length,
      });
    } else {
      // Return mock assignments for development using centralized factory
      const mockAssignments = getMockParentAssignments(weekStartDate);
      return createSuccessResponse(mockAssignments);
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

// Mock data for development using centralized factory
function getMockParentAssignments(weekStartDate) {
  const assignments = MockDataFactory.createWeeklyAssignments(weekStartDate);

  return {
    weekStartDate,
    assignments,
    totalAssignments: assignments.length,
    weekSummary: {
      totalTrips: assignments.length,
      totalPassengers: assignments.reduce(
        (sum, assignment) => sum + assignment.passengerCount,
        0
      ),
      dropoffTrips: assignments.filter((a) => a.routeType === "school_dropoff")
        .length,
      pickupTrips: assignments.filter((a) => a.routeType === "school_pickup")
        .length,
      estimatedDrivingTime: `${assignments.length} hours`,
    },
  };
}
