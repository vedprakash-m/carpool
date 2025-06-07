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
  context.log("Swap Requests API called");

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
    const { id: swapRequestId } = req.params;
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

    // TODO: Verify user role from JWT token
    const token = authHeader.split(" ")[1];

    // Initialize Cosmos DB (use environment variables or fallback to mock)
    let swapRequestsContainer = null;
    let assignmentsContainer = null;
    let usersContainer = null;

    if (process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY) {
      const cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
      });
      const database = cosmosClient.database("vcarpool");
      swapRequestsContainer = database.container("swapRequests");
      assignmentsContainer = database.container("rideAssignments");
      usersContainer = database.container("users");
    }

    switch (method) {
      case "GET":
        if (swapRequestId) {
          return await getSwapRequest(
            swapRequestsContainer,
            swapRequestId,
            context
          );
        } else {
          return await getSwapRequests(
            swapRequestsContainer,
            usersContainer,
            req,
            context
          );
        }
      case "POST":
        return await createSwapRequest(
          swapRequestsContainer,
          assignmentsContainer,
          usersContainer,
          req,
          context
        );
      case "PUT":
        return await updateSwapRequest(
          swapRequestsContainer,
          swapRequestId,
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
    context.log.error("Swap requests error:", error);
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

// Get all swap requests with filtering
async function getSwapRequests(container, usersContainer, req, context) {
  try {
    const queryParams = req.query || {};
    const { status, userId, adminView } = queryParams;

    if (container && usersContainer) {
      // Build query based on filters
      let query = "SELECT * FROM c";
      let parameters = [];

      if (status) {
        query += " WHERE c.status = @status";
        parameters.push({ name: "@status", value: status });
      }

      if (userId && !adminView) {
        const whereClause = status ? " AND" : " WHERE";
        query += `${whereClause} (c.requestingDriverId = @userId OR c.receivingDriverId = @userId)`;
        parameters.push({ name: "@userId", value: userId });
      }

      query += " ORDER BY c.createdAt DESC";

      const { resources: swapRequests } = await container.items
        .query({ query, parameters })
        .fetchAll();

      // Enhance with user details
      const enhancedRequests = await Promise.all(
        swapRequests.map(async (request) => {
          const { resources: requestingUser } = await usersContainer.items
            .query({
              query:
                "SELECT c.firstName, c.lastName, c.email, c.phoneNumber FROM c WHERE c.id = @id",
              parameters: [{ name: "@id", value: request.requestingDriverId }],
            })
            .fetchAll();

          const { resources: receivingUser } = await usersContainer.items
            .query({
              query:
                "SELECT c.firstName, c.lastName, c.email, c.phoneNumber FROM c WHERE c.id = @id",
              parameters: [{ name: "@id", value: request.receivingDriverId }],
            })
            .fetchAll();

          return {
            ...request,
            requestingDriver: requestingUser[0] || null,
            receivingDriver: receivingUser[0] || null,
          };
        })
      );

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            swapRequests: enhancedRequests,
            total: enhancedRequests.length,
            filters: { status, userId, adminView },
          },
        }),
      };
    } else {
      // Return mock swap requests for development
      const mockRequests = getMockSwapRequests();
      const filteredRequests = mockRequests.filter((request) => {
        if (status && request.status !== status) return false;
        if (userId && !adminView) {
          return (
            request.requestingDriverId === userId ||
            request.receivingDriverId === userId
          );
        }
        return true;
      });

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            swapRequests: filteredRequests,
            total: filteredRequests.length,
            filters: { status, userId, adminView },
          },
        }),
      };
    }
  } catch (error) {
    context.log.error("Get swap requests error:", error);
    throw error;
  }
}

// Get specific swap request
async function getSwapRequest(container, swapRequestId, context) {
  try {
    if (!swapRequestId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Swap request ID is required",
          },
        }),
      };
    }

    if (container) {
      const { resource: swapRequest } = await container
        .item(swapRequestId, swapRequestId)
        .read();

      if (!swapRequest) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "SWAP_REQUEST_NOT_FOUND",
              message: "Swap request not found",
            },
          }),
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: swapRequest,
        }),
      };
    } else {
      // Mock single swap request
      const mockRequests = getMockSwapRequests();
      const swapRequest = mockRequests.find((r) => r.id === swapRequestId);

      if (!swapRequest) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "SWAP_REQUEST_NOT_FOUND",
              message: "Swap request not found",
            },
          }),
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: swapRequest,
        }),
      };
    }
  } catch (error) {
    context.log.error("Get swap request error:", error);
    throw error;
  }
}

// Create new swap request
async function createSwapRequest(
  swapContainer,
  assignmentsContainer,
  usersContainer,
  req,
  context
) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Validate required fields
    const requiredFields = [
      "originalAssignmentId",
      "requestingDriverId",
      "receivingDriverId",
      "requestedDate",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Missing required field: ${field}`,
            },
          }),
        };
      }
    }

    // Validate that users are not trying to swap with themselves
    if (body.requestingDriverId === body.receivingDriverId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Cannot create swap request with yourself",
          },
        }),
      };
    }

    // Create swap request object
    const swapRequest = {
      id: `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      originalAssignmentId: body.originalAssignmentId,
      requestingDriverId: body.requestingDriverId,
      receivingDriverId: body.receivingDriverId,
      requestedDate: body.requestedDate,
      requestMessage: body.requestMessage || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (swapContainer) {
      // Save to Cosmos DB
      const { resource: createdRequest } = await swapContainer.items.create(
        swapRequest
      );

      // Send notification to receiving driver
      await sendSwapRequestNotification(
        "swap_request_created",
        createdRequest,
        context
      );
      context.log("Swap request created:", createdRequest.id);

      return {
        status: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: createdRequest,
          message: "Swap request created successfully",
        }),
      };
    } else {
      // Mock creation
      context.log("Mock swap request created:", swapRequest.id);
      return {
        status: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: swapRequest,
          message: "Swap request created successfully (mock mode)",
        }),
      };
    }
  } catch (error) {
    context.log.error("Create swap request error:", error);
    throw error;
  }
}

// Update swap request (accept/decline)
async function updateSwapRequest(container, swapRequestId, req, context) {
  try {
    if (!swapRequestId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Swap request ID is required for updates",
          },
        }),
      };
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { action, responseMessage } = body;

    // Validate action
    if (!action || !["accept", "decline", "cancel"].includes(action)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Action must be 'accept', 'decline', or 'cancel'",
          },
        }),
      };
    }

    if (container) {
      // Get existing swap request
      const { resource: existingRequest } = await container
        .item(swapRequestId, swapRequestId)
        .read();

      if (!existingRequest) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "SWAP_REQUEST_NOT_FOUND",
              message: "Swap request not found",
            },
          }),
        };
      }

      // Validate that request is still pending
      if (existingRequest.status !== "pending") {
        return {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "INVALID_STATUS",
              message: `Cannot ${action} swap request with status: ${existingRequest.status}`,
            },
          }),
        };
      }

      // Update the swap request
      const updatedRequest = {
        ...existingRequest,
        status:
          action === "accept"
            ? "accepted"
            : action === "decline"
            ? "declined"
            : "cancelled",
        responseMessage: responseMessage || "",
        respondedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { resource: result } = await container
        .item(swapRequestId, swapRequestId)
        .replace(updatedRequest);

      // Send notification to requesting driver
      const notificationType =
        action === "accept" ? "swap_request_accepted" : "swap_request_declined";
      await sendSwapRequestNotification(notificationType, result, context);

      // TODO: If accepted, update the actual assignments

      context.log(`Swap request ${action}ed:`, result.id);

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result,
          message: `Swap request ${action}ed successfully`,
        }),
      };
    } else {
      // Mock update
      const mockRequests = getMockSwapRequests();
      const swapRequest = mockRequests.find((r) => r.id === swapRequestId);

      if (!swapRequest) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "SWAP_REQUEST_NOT_FOUND",
              message: "Swap request not found",
            },
          }),
        };
      }

      const updatedRequest = {
        ...swapRequest,
        status:
          action === "accept"
            ? "accepted"
            : action === "decline"
            ? "declined"
            : "cancelled",
        responseMessage: responseMessage || "",
        respondedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: updatedRequest,
          message: `Swap request ${action}ed successfully (mock mode)`,
        }),
      };
    }
  } catch (error) {
    context.log.error("Update swap request error:", error);
    throw error;
  }
}

// Mock data for development and testing
function getMockSwapRequests() {
  return [
    {
      id: "swap-1",
      originalAssignmentId: "assignment-1",
      requestingDriverId: "parent-1",
      requestingDriver: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "mock.driver@example.com",
        phoneNumber: "555-0123",
      },
      receivingDriverId: "parent-2",
      receivingDriver: {
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@example.com",
        phoneNumber: "555-0124",
      },
      requestedDate: "2025-01-06",
      requestMessage:
        "I have a doctor's appointment that morning and won't be able to make the Monday drop-off. Would you be able to swap with me?",
      status: "pending",
      createdAt: "2025-01-05T14:30:00.000Z",
      updatedAt: "2025-01-05T14:30:00.000Z",
      originalAssignment: {
        description: "Monday Morning School Drop-off",
        startTime: "07:30",
        endTime: "08:30",
        routeType: "school_dropoff",
      },
    },
    {
      id: "swap-2",
      originalAssignmentId: "assignment-2",
      requestingDriverId: "parent-3",
      requestingDriver: {
        firstName: "Jennifer",
        lastName: "Davis",
        email: "jennifer.davis@example.com",
        phoneNumber: "555-0125",
      },
      receivingDriverId: "parent-1",
      receivingDriver: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "mock.driver@example.com",
        phoneNumber: "555-0123",
      },
      requestedDate: "2025-01-08",
      requestMessage:
        "My work schedule changed and I need to be in early that day. Can we swap?",
      status: "accepted",
      responseMessage:
        "Sure, no problem! I can take the Wednesday afternoon pickup.",
      createdAt: "2025-01-04T10:15:00.000Z",
      updatedAt: "2025-01-04T16:20:00.000Z",
      respondedAt: "2025-01-04T16:20:00.000Z",
      originalAssignment: {
        description: "Wednesday Afternoon School Pick-up",
        startTime: "15:00",
        endTime: "16:00",
        routeType: "school_pickup",
      },
    },
    {
      id: "swap-3",
      originalAssignmentId: "assignment-3",
      requestingDriverId: "parent-4",
      requestingDriver: {
        firstName: "David",
        lastName: "Wilson",
        email: "david.wilson@example.com",
        phoneNumber: "555-0126",
      },
      receivingDriverId: "parent-5",
      receivingDriver: {
        firstName: "Lisa",
        lastName: "Thompson",
        email: "lisa.thompson@example.com",
        phoneNumber: "555-0127",
      },
      requestedDate: "2025-01-10",
      requestMessage:
        "Family emergency came up. Really need someone to cover Friday morning.",
      status: "declined",
      responseMessage:
        "Sorry, I already have plans that morning. Hope you find someone else!",
      createdAt: "2025-01-05T09:45:00.000Z",
      updatedAt: "2025-01-05T11:30:00.000Z",
      respondedAt: "2025-01-05T11:30:00.000Z",
      originalAssignment: {
        description: "Friday Morning School Drop-off",
        startTime: "07:30",
        endTime: "08:30",
        routeType: "school_dropoff",
      },
    },
  ];
}

// Send swap request notifications
async function sendSwapRequestNotification(type, swapRequest, context) {
  try {
    // In production, this would make HTTP request to notification service
    // For now, we'll simulate the notification sending

    const mockNotificationData = {
      type,
      recipientEmail: getRecipientEmail(type, swapRequest),
      data: buildNotificationData(type, swapRequest),
    };

    context.log(`Notification simulated: ${type}`, mockNotificationData);

    // Simulate async notification sending
    return Promise.resolve({
      success: true,
      notificationId: `notification-${Date.now()}`,
      type,
      status: "sent",
    });
  } catch (error) {
    context.log.error("Failed to send swap request notification:", error);
    // Don't throw error to avoid breaking the main workflow
    return { success: false, error: error.message };
  }
}

// Get recipient email based on notification type
function getRecipientEmail(type, swapRequest) {
  switch (type) {
    case "swap_request_created":
      return swapRequest.receivingDriver?.email || "receiving-driver@example.com";
    case "swap_request_accepted":
    case "swap_request_declined":
      return (
        swapRequest.requestingDriver?.email || "requesting-driver@example.com"
      );
    default:
      return "unknown@example.com";
  }
}

// Build notification data from swap request
function buildNotificationData(type, swapRequest) {
  const baseData = {
    assignmentDate: formatDate(swapRequest.requestedDate),
    assignmentTime: `${swapRequest.originalAssignment?.startTime} - ${swapRequest.originalAssignment?.endTime}`,
    assignmentDescription:
      swapRequest.originalAssignment?.description || "Carpool Assignment",
    requestMessage: swapRequest.requestMessage || "No message provided",
  };

  switch (type) {
    case "swap_request_created":
      return {
        ...baseData,
        receivingDriverName: `${swapRequest.receivingDriver?.firstName} ${swapRequest.receivingDriver?.lastName}`,
        requestingDriverName: `${swapRequest.requestingDriver?.firstName} ${swapRequest.requestingDriver?.lastName}`,
        requestingDriverEmail: swapRequest.requestingDriver?.email,
        requestingDriverPhone: swapRequest.requestingDriver?.phoneNumber,
      };
    case "swap_request_accepted":
    case "swap_request_declined":
      return {
        ...baseData,
        requestingDriverName: `${swapRequest.requestingDriver?.firstName} ${swapRequest.requestingDriver?.lastName}`,
        receivingDriverName: `${swapRequest.receivingDriver?.firstName} ${swapRequest.receivingDriver?.lastName}`,
        receivingDriverEmail: swapRequest.receivingDriver?.email,
        receivingDriverPhone: swapRequest.receivingDriver?.phoneNumber,
        responseMessage:
          swapRequest.responseMessage || "No response message provided",
      };
    default:
      return baseData;
  }
}

// Helper function to format date for notifications
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
