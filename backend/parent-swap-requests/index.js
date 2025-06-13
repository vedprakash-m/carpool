const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock data storage (replace with actual database in production)
let mockSwapRequests = [
  {
    id: "swap-1",
    scheduleId: "schedule-1",
    requesterId: "parent-123",
    requester: {
      id: "parent-123",
      firstName: "John",
      lastName: "Parent",
      email: "john.parent@example.com",
    },
    originalAssignmentId: "assignment-1",
    originalAssignment: {
      id: "assignment-1",
      date: "2024-01-08", // Monday
      dayOfWeek: "monday",
      morningTrip: {
        driverId: "parent-123",
        driver: { firstName: "John", lastName: "Parent" },
      },
    },
    proposedChange: {
      date: "2024-01-09", // Tuesday
      role: "passenger",
      timeSlot: "morning",
    },
    targetParentId: "parent-456",
    targetParent: {
      id: "parent-456",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@example.com",
    },
    reason: "Doctor appointment on Monday morning",
    priority: "medium",
    status: "pending",
    autoAcceptAt: "2024-01-07T17:00:00Z", // Sunday 5PM
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "swap-2",
    scheduleId: "schedule-1",
    requesterId: "parent-456",
    requester: {
      id: "parent-456",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@example.com",
    },
    originalAssignmentId: "assignment-2",
    originalAssignment: {
      id: "assignment-2",
      date: "2024-01-10", // Wednesday
      dayOfWeek: "wednesday",
      morningTrip: {
        driverId: "parent-789",
        driver: { firstName: "David", lastName: "Kim" },
      },
    },
    proposedChange: {
      date: "2024-01-11", // Thursday
      role: "driver",
      timeSlot: "morning",
    },
    reason: "Emergency meeting moved to Wednesday",
    priority: "high",
    status: "auto_accepted",
    autoAcceptAt: "2024-01-07T17:00:00Z",
    respondedAt: "2024-01-07T17:00:01Z", // Auto-accepted at deadline
    responseMessage: "Auto-accepted due to no response by deadline",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockWeeklySchedules = [
  {
    id: "schedule-1",
    groupId: "group-1",
    weekStartDate: "2024-01-08",
    weekEndDate: "2024-01-12",
    status: "swaps_open",
    swapsDeadline: "2024-01-07T17:00:00Z",
    assignments: [
      {
        id: "assignment-1",
        date: "2024-01-08",
        dayOfWeek: "monday",
        morningTrip: {
          driverId: "parent-123",
          driver: { firstName: "John", lastName: "Parent" },
          passengers: [],
        },
      },
      {
        id: "assignment-2",
        date: "2024-01-10",
        dayOfWeek: "wednesday",
        morningTrip: {
          driverId: "parent-789",
          driver: { firstName: "David", lastName: "Kim" },
          passengers: [
            {
              parentId: "parent-456",
              parent: { firstName: "Maria", lastName: "Garcia" },
            },
          ],
        },
      },
    ],
  },
];

// Utility functions
function isSwapDeadlinePassed(swapsDeadline) {
  return new Date() > new Date(swapsDeadline);
}

function isAutoAcceptanceTime(autoAcceptAt) {
  return new Date() >= new Date(autoAcceptAt);
}

function findAssignmentById(schedules, assignmentId) {
  for (const schedule of schedules) {
    const assignment = schedule.assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      return { schedule, assignment };
    }
  }
  return null;
}

function canUserMakeSwapRequest(userId, assignment) {
  // User can request swap if they are the driver or a passenger
  if (assignment.morningTrip?.driverId === userId) {
    return true;
  }

  if (assignment.morningTrip?.passengers?.some((p) => p.parentId === userId)) {
    return true;
  }

  if (assignment.afternoonTrip?.driverId === userId) {
    return true;
  }

  if (
    assignment.afternoonTrip?.passengers?.some((p) => p.parentId === userId)
  ) {
    return true;
  }

  return false;
}

function processAutoAcceptance() {
  // Check for requests that should be auto-accepted
  const now = new Date();

  mockSwapRequests.forEach((request, index) => {
    if (
      request.status === "pending" &&
      isAutoAcceptanceTime(request.autoAcceptAt)
    ) {
      mockSwapRequests[index] = {
        ...request,
        status: "auto_accepted",
        respondedAt: now.toISOString(),
        responseMessage: "Auto-accepted due to no response by deadline",
        updatedAt: now.toISOString(),
      };
    }
  });
}

module.exports = async function (context, req) {
  try {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Process any pending auto-acceptances
    processAutoAcceptance();

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError("Authentication required");
      return;
    }

    const token = authHeader.split(" ")[1];
    if (
      !token.includes("parent") &&
      !token.includes("trip_admin") &&
      !token.includes("admin")
    ) {
      context.res = UnifiedResponseHandler.forbiddenError(
        "Parent access required"
      );
      return;
    }

    const method = req.method;
    const action = req.query.action;
    const parentId = "parent-123"; // Extract from token in production

    if (method === "GET" && !action) {
      // Get swap requests for user
      const { scheduleId, status } = req.query;

      let userRequests = mockSwapRequests.filter(
        (r) => r.requesterId === parentId || r.targetParentId === parentId
      );

      if (scheduleId) {
        userRequests = userRequests.filter((r) => r.scheduleId === scheduleId);
      }

      if (status) {
        userRequests = userRequests.filter((r) => r.status === status);
      }

      // Sort by created date (newest first)
      userRequests.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      context.res = UnifiedResponseHandler.success(
        {
          requests: userRequests,
          total: userRequests.length,
        },
        "Swap requests retrieved successfully"
      );
      return;
    }

    if (method === "POST" && action === "create") {
      // Create new swap request
      const {
        scheduleId,
        originalAssignmentId,
        proposedChange,
        targetParentId,
        reason,
        priority = "medium",
      } = req.body;

      if (!scheduleId || !originalAssignmentId || !proposedChange || !reason) {
        context.res = UnifiedResponseHandler.validationError(
          "Schedule ID, assignment ID, proposed change, and reason are required"
        );
        return;
      }

      // Find the schedule and assignment
      const schedule = mockWeeklySchedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Weekly schedule not found"
        );
        return;
      }

      // Check if swaps are still open
      if (schedule.status !== "swaps_open") {
        context.res = UnifiedResponseHandler.validationError(
          "Swap request period has ended"
        );
        return;
      }

      if (isSwapDeadlinePassed(schedule.swapsDeadline)) {
        context.res = UnifiedResponseHandler.validationError(
          "Swap request deadline has passed"
        );
        return;
      }

      const assignment = schedule.assignments.find(
        (a) => a.id === originalAssignmentId
      );
      if (!assignment) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Assignment not found"
        );
        return;
      }

      // Verify user can request swap for this assignment
      if (!canUserMakeSwapRequest(parentId, assignment)) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only request swaps for assignments you're involved in"
        );
        return;
      }

      // Check for existing pending request for this assignment
      const existingRequest = mockSwapRequests.find(
        (r) =>
          r.originalAssignmentId === originalAssignmentId &&
          r.requesterId === parentId &&
          r.status === "pending"
      );
      if (existingRequest) {
        context.res = UnifiedResponseHandler.conflictError(
          "You already have a pending swap request for this assignment"
        );
        return;
      }

      // Create new swap request
      const newRequest = {
        id: uuidv4(),
        scheduleId,
        requesterId: parentId,
        requester: {
          id: parentId,
          firstName: "John", // Mock data - get from user context
          lastName: "Parent",
          email: "john.parent@example.com",
        },
        originalAssignmentId,
        originalAssignment: assignment,
        proposedChange,
        targetParentId: targetParentId || null,
        targetParent: targetParentId
          ? {
              id: targetParentId,
              firstName: "Target", // In production, fetch from database
              lastName: "Parent",
              email: "target@example.com",
            }
          : null,
        reason,
        priority,
        status: "pending",
        autoAcceptAt: schedule.swapsDeadline, // Auto-accept at Sunday 5PM deadline
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSwapRequests.push(newRequest);

      context.res = UnifiedResponseHandler.created(
        {
          request: newRequest,
        },
        "Swap request created successfully"
      );
      return;
    }

    if (method === "PUT" && action === "respond") {
      // Respond to a swap request (accept/decline)
      const { requestId, response, responseMessage } = req.body;

      if (!requestId || !response) {
        context.res = UnifiedResponseHandler.validationError(
          "Request ID and response are required"
        );
        return;
      }

      if (!["accepted", "declined"].includes(response)) {
        context.res = UnifiedResponseHandler.validationError(
          "Response must be 'accepted' or 'declined'"
        );
        return;
      }

      const requestIndex = mockSwapRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Swap request not found"
        );
        return;
      }

      const swapRequest = mockSwapRequests[requestIndex];

      // Check if user can respond to this request
      if (
        swapRequest.targetParentId &&
        swapRequest.targetParentId !== parentId
      ) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only respond to requests directed to you"
        );
        return;
      }

      // Check if request is still pending
      if (swapRequest.status !== "pending") {
        context.res = UnifiedResponseHandler.validationError(
          "This request has already been responded to"
        );
        return;
      }

      // Check if deadline has passed
      if (isAutoAcceptanceTime(swapRequest.autoAcceptAt)) {
        context.res = UnifiedResponseHandler.validationError(
          "Response deadline has passed - request will be auto-accepted"
        );
        return;
      }

      // Update request
      mockSwapRequests[requestIndex] = {
        ...swapRequest,
        status: response,
        respondedAt: new Date().toISOString(),
        responseMessage: responseMessage || "",
        updatedAt: new Date().toISOString(),
      };

      context.res = UnifiedResponseHandler.success(
        {
          request: mockSwapRequests[requestIndex],
        },
        `Swap request ${response} successfully`
      );
      return;
    }

    if (method === "DELETE" && req.query.id) {
      // Cancel own swap request
      const requestId = req.query.id;

      const requestIndex = mockSwapRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Swap request not found"
        );
        return;
      }

      const swapRequest = mockSwapRequests[requestIndex];

      // Check if user owns this request
      if (swapRequest.requesterId !== parentId) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only cancel your own requests"
        );
        return;
      }

      // Check if request can be cancelled
      if (swapRequest.status !== "pending") {
        context.res = UnifiedResponseHandler.validationError(
          "Only pending requests can be cancelled"
        );
        return;
      }

      // Update status to cancelled
      mockSwapRequests[requestIndex] = {
        ...swapRequest,
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      };

      context.res = UnifiedResponseHandler.success(
        {},
        "Swap request cancelled successfully"
      );
      return;
    }

    if (method === "GET" && action === "available-swaps") {
      // Get available swap opportunities for a schedule
      const { scheduleId } = req.query;

      if (!scheduleId) {
        context.res = UnifiedResponseHandler.validationError(
          "Schedule ID is required"
        );
        return;
      }

      const schedule = mockWeeklySchedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        context.res =
          UnifiedResponseHandler.notFoundError("Schedule not found");
        return;
      }

      // Find assignments where user is involved
      const userAssignments = schedule.assignments.filter((assignment) =>
        canUserMakeSwapRequest(parentId, assignment)
      );

      // Find potential swap partners (other parents with assignments)
      const swapOpportunities = schedule.assignments
        .filter((assignment) => !canUserMakeSwapRequest(parentId, assignment))
        .map((assignment) => ({
          assignmentId: assignment.id,
          date: assignment.date,
          dayOfWeek: assignment.dayOfWeek,
          currentDriver:
            assignment.morningTrip?.driver || assignment.afternoonTrip?.driver,
          availableRoles: ["driver", "passenger"], // Simplified
          timeSlots: ["morning", "afternoon"].filter(
            (slot) => assignment[`${slot}Trip`]
          ),
        }));

      context.res = UnifiedResponseHandler.success(
        {
          userAssignments,
          swapOpportunities,
          deadline: schedule.swapsDeadline,
          canRequestSwaps:
            schedule.status === "swaps_open" &&
            !isSwapDeadlinePassed(schedule.swapsDeadline),
        },
        "Swap opportunities retrieved successfully"
      );
      return;
    }

    // Invalid method or action
    context.res = UnifiedResponseHandler.methodNotAllowedError(
      `Method ${method} with action ${action} not allowed`
    );
  } catch (error) {
    context.log.error("Swap requests error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};
