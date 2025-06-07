const { CosmosClient } = require("@azure/cosmos");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

module.exports = async function (context, req) {
  context.log("Admin Driver Selection API called");

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

    // TODO: Verify admin role from JWT token
    const token = authHeader.split(" ")[1];

    // Initialize Cosmos DB (use environment variables or fallback to mock)
    let cosmosClient = null;
    let usersContainer = null;
    let designationsContainer = null;

    if (process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY) {
      cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
      });
      const database = cosmosClient.database("vcarpool");
      usersContainer = database.container("users");
      designationsContainer = database.container("driverDesignations");
    }

    const weekStartDate = req.params.weekStartDate;
    const method = req.method.toUpperCase();

    switch (method) {
      case "GET":
        if (weekStartDate) {
          return await getWeekDriverDesignations(
            designationsContainer,
            usersContainer,
            weekStartDate,
            context
          );
        } else {
          return await getAllPotentialDrivers(usersContainer, context);
        }
      case "POST":
      case "PUT":
        return await setWeekDriverDesignations(
          designationsContainer,
          req,
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
    context.log.error("Driver selection error:", error);
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

// Get all potential drivers (parents with driving capability)
async function getAllPotentialDrivers(container, context) {
  try {
    if (container) {
      // Query for parent users who can drive
      const { resources: users } = await container.items
        .query(
          `
          SELECT c.id, c.firstName, c.lastName, c.email, c.phoneNumber, 
                 c.preferences.isDriver, c.preferences.pickupLocation, 
                 c.preferences.dropoffLocation, c.createdAt
          FROM c 
          WHERE c.role = 'parent' AND c.preferences.isDriver = true
          ORDER BY c.firstName, c.lastName
        `
        )
        .fetchAll();

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: users.map((user) => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phoneNumber: user.phoneNumber,
            pickupLocation: user.preferences?.pickupLocation,
            dropoffLocation: user.preferences?.dropoffLocation,
            joinedDate: user.createdAt,
          })),
          pagination: {
            total: users.length,
            page: 1,
            limit: users.length,
          },
        }),
      };
    } else {
      // Mock potential drivers
      const mockDrivers = getMockPotentialDrivers();
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: mockDrivers,
          pagination: {
            total: mockDrivers.length,
            page: 1,
            limit: mockDrivers.length,
          },
        }),
      };
    }
  } catch (error) {
    context.log.error("Get potential drivers error:", error);
    throw error;
  }
}

// Get driver designations for a specific week
async function getWeekDriverDesignations(
  designationsContainer,
  usersContainer,
  weekStartDate,
  context
) {
  try {
    // Validate week start date format
    if (!isValidWeekStartDate(weekStartDate)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid week start date format. Expected YYYY-MM-DD for a Monday.",
          },
        }),
      };
    }

    if (designationsContainer && usersContainer) {
      // Get existing designations for the week
      const { resources: designations } = await designationsContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.weekStartDate = @weekStartDate",
          parameters: [{ name: "@weekStartDate", value: weekStartDate }],
        })
        .fetchAll();

      // Get all potential drivers
      const { resources: potentialDrivers } = await usersContainer.items
        .query(
          `
          SELECT c.id, c.firstName, c.lastName, c.email, c.phoneNumber, 
                 c.preferences.isDriver
          FROM c 
          WHERE c.role = 'parent' AND c.preferences.isDriver = true
        `
        )
        .fetchAll();

      // Map designations to driver info
      const activeDriverIds = new Set(designations.map((d) => d.driverId));
      const driversWithStatus = potentialDrivers.map((driver) => ({
        id: driver.id,
        name: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        isActive: activeDriverIds.has(driver.id),
        designation: designations.find((d) => d.driverId === driver.id),
      }));

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            weekStartDate,
            drivers: driversWithStatus,
            activeDriverCount: activeDriverIds.size,
            totalPotentialDrivers: potentialDrivers.length,
          },
        }),
      };
    } else {
      // Mock week designations
      const mockDesignations = getMockWeekDesignations(weekStartDate);
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: mockDesignations,
        }),
      };
    }
  } catch (error) {
    context.log.error("Get week designations error:", error);
    throw error;
  }
}

// Set driver designations for a specific week
async function setWeekDriverDesignations(container, req, context) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Validate required fields
    if (!body.weekStartDate || !Array.isArray(body.activeDriverIds)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "weekStartDate and activeDriverIds array are required",
          },
        }),
      };
    }

    // Validate week start date
    if (!isValidWeekStartDate(body.weekStartDate)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid week start date format. Expected YYYY-MM-DD for a Monday.",
          },
        }),
      };
    }

    if (container) {
      // Delete existing designations for this week
      const { resources: existingDesignations } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.weekStartDate = @weekStartDate",
          parameters: [{ name: "@weekStartDate", value: body.weekStartDate }],
        })
        .fetchAll();

      // Delete existing designations
      for (const designation of existingDesignations) {
        await container
          .item(designation.id, designation.weekStartDate)
          .delete();
      }

      // Create new designations
      const newDesignations = [];
      for (const driverId of body.activeDriverIds) {
        const designation = {
          id: `designation-${body.weekStartDate}-${driverId}`,
          weekStartDate: body.weekStartDate,
          driverId: driverId,
          designatedBy: "admin", // TODO: Get from JWT token
          designatedAt: new Date().toISOString(),
          isActive: true,
        };

        const { resource: created } = await container.items.create(designation);
        newDesignations.push(created);
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            weekStartDate: body.weekStartDate,
            activeDriverCount: newDesignations.length,
            designations: newDesignations,
          },
          message: `Driver designations updated for week of ${body.weekStartDate}`,
        }),
      };
    } else {
      // Mock designation update
      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            weekStartDate: body.weekStartDate,
            activeDriverCount: body.activeDriverIds.length,
            designations: body.activeDriverIds.map((driverId) => ({
              id: `mock-designation-${body.weekStartDate}-${driverId}`,
              weekStartDate: body.weekStartDate,
              driverId: driverId,
              designatedBy: "admin",
              designatedAt: new Date().toISOString(),
              isActive: true,
            })),
          },
          message: `Driver designations updated for week of ${body.weekStartDate} (mock mode)`,
        }),
      };
    }
  } catch (error) {
    context.log.error("Set designations error:", error);
    throw error;
  }
}

// Helper functions
function isValidWeekStartDate(dateString) {
  const date = new Date(dateString);
  // Check if it's a valid date and is a Monday (day 1)
  return !isNaN(date.getTime()) && date.getDay() === 1;
}

function getMockPotentialDrivers() {
  return [
    {
      id: "parent-1",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phoneNumber: "555-0123",
      pickupLocation: "123 Maple Street",
      dropoffLocation: "Lincoln Elementary School",
      joinedDate: "2024-08-15T00:00:00.000Z",
    },
    {
      id: "parent-2",
      name: "Michael Chen",
      email: "michael.chen@email.com",
      phoneNumber: "555-0124",
      pickupLocation: "456 Oak Avenue",
      dropoffLocation: "Lincoln Elementary School",
      joinedDate: "2024-08-20T00:00:00.000Z",
    },
    {
      id: "parent-3",
      name: "Jennifer Davis",
      email: "jennifer.davis@email.com",
      phoneNumber: "555-0125",
      pickupLocation: "789 Pine Road",
      dropoffLocation: "Lincoln Elementary School",
      joinedDate: "2024-09-01T00:00:00.000Z",
    },
    {
      id: "parent-4",
      name: "David Wilson",
      email: "david.wilson@email.com",
      phoneNumber: "555-0126",
      pickupLocation: "321 Elm Drive",
      dropoffLocation: "Lincoln Elementary School",
      joinedDate: "2024-09-05T00:00:00.000Z",
    },
    {
      id: "parent-5",
      name: "Lisa Thompson",
      email: "lisa.thompson@email.com",
      phoneNumber: "555-0127",
      pickupLocation: "654 Cedar Lane",
      dropoffLocation: "Lincoln Elementary School",
      joinedDate: "2024-09-10T00:00:00.000Z",
    },
  ];
}

function getMockWeekDesignations(weekStartDate) {
  const allDrivers = getMockPotentialDrivers();
  // Mock: First 3 drivers are active for this week
  const activeDriverIds = new Set(["parent-1", "parent-2", "parent-3"]);

  return {
    weekStartDate,
    drivers: allDrivers.map((driver) => ({
      ...driver,
      isActive: activeDriverIds.has(driver.id),
      designation: activeDriverIds.has(driver.id)
        ? {
            id: `designation-${weekStartDate}-${driver.id}`,
            weekStartDate,
            driverId: driver.id,
            designatedBy: "admin",
            designatedAt: "2025-01-06T10:00:00.000Z",
            isActive: true,
          }
        : null,
    })),
    activeDriverCount: activeDriverIds.size,
    totalPotentialDrivers: allDrivers.length,
  };
}
