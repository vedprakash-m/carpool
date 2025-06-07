const { v4: uuidv4 } = require("uuid");

// Mock data storage (replace with actual database in production)
let mockJoinRequests = [
  {
    id: "req-1",
    groupId: "group-1",
    group: {
      id: "group-1",
      name: "Lincoln Morning Riders",
      targetSchool: {
        id: "school-1",
        name: "Lincoln Elementary School",
      },
    },
    requesterId: "parent-123",
    requester: {
      id: "parent-123",
      firstName: "John",
      lastName: "Parent",
      email: "john.parent@example.com",
      phone: "(555) 123-4567",
    },
    status: "pending",
    message:
      "Hi! I'm looking for a reliable carpool for my daughter Emma (Grade 2). I live 2 miles from Lincoln Elementary and would love to join your group. I have a clean driving record and can help with driving duties.",
    childrenInfo: [{ name: "Emma Parent", grade: "2" }],
    matchScore: 85,
    matchReasons: [
      "Exact school match",
      "Within service area (2.1 miles)",
      "Compatible age groups (2)",
    ],
    distance: 2.1,
    requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
  {
    id: "req-2",
    groupId: "group-1",
    group: {
      id: "group-1",
      name: "Lincoln Morning Riders",
      targetSchool: {
        id: "school-1",
        name: "Lincoln Elementary School",
      },
    },
    requesterId: "parent-456",
    requester: {
      id: "parent-456",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@example.com",
      phone: "(555) 456-7890",
    },
    status: "pending",
    message:
      "Hello! I have twin boys in kindergarten and would like to join your morning carpool. I work early hours so this would be perfect for our schedule. I can contribute to driving and am very reliable.",
    childrenInfo: [
      { name: "Carlos Garcia", grade: "K" },
      { name: "Diego Garcia", grade: "K" },
    ],
    matchScore: 92,
    matchReasons: [
      "Exact school match",
      "Within service area (1.5 miles)",
      "Compatible age groups (K)",
      "Compatible schedule (5 days)",
    ],
    distance: 1.5,
    requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    id: "req-3",
    groupId: "group-2",
    group: {
      id: "group-2",
      name: "Washington Afternoon Express",
      targetSchool: {
        id: "school-2",
        name: "Washington Middle School",
      },
    },
    requesterId: "parent-789",
    requester: {
      id: "parent-789",
      firstName: "David",
      lastName: "Kim",
      email: "david.kim@example.com",
      phone: "(555) 789-0123",
    },
    status: "approved",
    message:
      "Looking for after-school pickup help for my 7th grader. I work until 6 PM most days.",
    childrenInfo: [{ name: "Sarah Kim", grade: "7" }],
    matchScore: 78,
    matchReasons: [
      "Exact school match",
      "Within service area (3.2 miles)",
      "Compatible age groups (7)",
    ],
    distance: 3.2,
    reviewedBy: "trip-admin-2",
    reviewedByUser: {
      id: "trip-admin-2",
      firstName: "Mike",
      lastName: "Chen",
    },
    reviewMessage:
      "Welcome to the group! Please coordinate with other parents for driving schedule.",
    requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockCarpoolGroups = [
  {
    id: "group-1",
    name: "Lincoln Morning Riders",
    tripAdminId: "trip-admin-1",
    maxChildren: 6,
    memberCount: 4,
    isAcceptingMembers: true,
  },
  {
    id: "group-2",
    name: "Washington Afternoon Express",
    tripAdminId: "trip-admin-2",
    maxChildren: 8,
    memberCount: 6,
    isAcceptingMembers: true,
  },
];

module.exports = async function (context, req) {
  try {
    // Set CORS headers
    context.res = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
      },
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      context.res.status = 200;
      context.res.body = "";
      return;
    }

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res.status = 401;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
      return;
    }

    // Simple token validation (replace with actual JWT validation)
    const token = authHeader.split(" ")[1];
    if (!token.includes("trip_admin") && !token.includes("admin")) {
      context.res.status = 403;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Trip Admin access required",
        },
      });
      return;
    }

    const method = req.method;
    const action = req.query.action;
    const requestId = req.query.id;

    // Extract Trip Admin ID from token (mock)
    const tripAdminId = "trip-admin-1"; // In production, extract from JWT

    if (method === "GET" && !action) {
      // Get all join requests for Trip Admin's groups
      const { status, groupId, limit = 50, offset = 0 } = req.query;

      // Get groups managed by this Trip Admin
      const adminGroups = mockCarpoolGroups.filter(
        (g) => g.tripAdminId === tripAdminId
      );
      const adminGroupIds = adminGroups.map((g) => g.id);

      let filteredRequests = mockJoinRequests.filter((r) =>
        adminGroupIds.includes(r.groupId)
      );

      // Apply filters
      if (status) {
        filteredRequests = filteredRequests.filter((r) => r.status === status);
      }

      if (groupId) {
        filteredRequests = filteredRequests.filter(
          (r) => r.groupId === groupId
        );
      }

      // Sort by request date (newest first)
      filteredRequests.sort(
        (a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)
      );

      // Apply pagination
      const total = filteredRequests.length;
      const paginatedRequests = filteredRequests.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          requests: paginatedRequests,
          total,
          pending: filteredRequests.filter((r) => r.status === "pending")
            .length,
          approved: filteredRequests.filter((r) => r.status === "approved")
            .length,
          denied: filteredRequests.filter((r) => r.status === "denied").length,
          groups: adminGroups,
          message: "Join requests retrieved successfully",
        },
      });
      return;
    }

    if (method === "GET" && requestId) {
      // Get specific join request details
      const request = mockJoinRequests.find((r) => r.id === requestId);

      if (!request) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Join request not found",
          },
        });
        return;
      }

      // Verify Trip Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only view requests for your own groups",
          },
        });
        return;
      }

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          request,
          message: "Join request retrieved successfully",
        },
      });
      return;
    }

    if (method === "PUT" && action === "approve") {
      // Approve a join request
      const { requestId, reviewMessage } = req.body;

      if (!requestId) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
        });
        return;
      }

      const requestIndex = mockJoinRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Join request not found",
          },
        });
        return;
      }

      const request = mockJoinRequests[requestIndex];

      // Verify Trip Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only approve requests for your own groups",
          },
        });
        return;
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Only pending requests can be approved",
          },
        });
        return;
      }

      // Check group capacity
      const childrenCount = request.childrenInfo?.length || 1;
      if (group.memberCount + childrenCount > group.maxChildren) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "CAPACITY_EXCEEDED",
            message: "Adding this family would exceed group capacity",
          },
        });
        return;
      }

      // Update request
      mockJoinRequests[requestIndex] = {
        ...request,
        status: "approved",
        reviewedBy: tripAdminId,
        reviewedByUser: {
          id: tripAdminId,
          firstName: "Sarah", // Mock data
          lastName: "Johnson",
        },
        reviewMessage: reviewMessage || "Welcome to the group!",
        reviewedAt: new Date().toISOString(),
      };

      // Update group member count
      const groupIndex = mockCarpoolGroups.findIndex(
        (g) => g.id === request.groupId
      );
      if (groupIndex !== -1) {
        mockCarpoolGroups[groupIndex].memberCount += childrenCount;
      }

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          request: mockJoinRequests[requestIndex],
          message:
            "Join request approved successfully. Parent will be notified.",
        },
      });
      return;
    }

    if (method === "PUT" && action === "deny") {
      // Deny a join request
      const { requestId, reviewMessage } = req.body;

      if (!requestId) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request ID is required",
          },
        });
        return;
      }

      const requestIndex = mockJoinRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Join request not found",
          },
        });
        return;
      }

      const request = mockJoinRequests[requestIndex];

      // Verify Trip Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only deny requests for your own groups",
          },
        });
        return;
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Only pending requests can be denied",
          },
        });
        return;
      }

      // Update request
      mockJoinRequests[requestIndex] = {
        ...request,
        status: "denied",
        reviewedBy: tripAdminId,
        reviewedByUser: {
          id: tripAdminId,
          firstName: "Sarah", // Mock data
          lastName: "Johnson",
        },
        reviewMessage:
          reviewMessage ||
          "Thank you for your interest. Unfortunately, we cannot accommodate your request at this time.",
        reviewedAt: new Date().toISOString(),
      };

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          request: mockJoinRequests[requestIndex],
          message: "Join request denied. Parent will be notified.",
        },
      });
      return;
    }

    if (method === "GET" && action === "stats") {
      // Get join request statistics for Trip Admin
      const adminGroups = mockCarpoolGroups.filter(
        (g) => g.tripAdminId === tripAdminId
      );
      const adminGroupIds = adminGroups.map((g) => g.id);

      const adminRequests = mockJoinRequests.filter((r) =>
        adminGroupIds.includes(r.groupId)
      );

      const stats = {
        totalRequests: adminRequests.length,
        pendingRequests: adminRequests.filter((r) => r.status === "pending")
          .length,
        approvedRequests: adminRequests.filter((r) => r.status === "approved")
          .length,
        deniedRequests: adminRequests.filter((r) => r.status === "denied")
          .length,
        averageMatchScore:
          adminRequests.length > 0
            ? Math.round(
                adminRequests.reduce((sum, r) => sum + (r.matchScore || 0), 0) /
                  adminRequests.length
              )
            : 0,
        requestsByGroup: adminGroups.map((group) => ({
          groupId: group.id,
          groupName: group.name,
          pendingCount: adminRequests.filter(
            (r) => r.groupId === group.id && r.status === "pending"
          ).length,
          totalCount: adminRequests.filter((r) => r.groupId === group.id)
            .length,
        })),
        recentRequests: adminRequests
          .filter((r) => r.status === "pending")
          .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
          .slice(0, 5),
      };

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          stats,
          message: "Join request statistics retrieved successfully",
        },
      });
      return;
    }

    // Invalid method or action
    context.res.status = 405;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: `Method ${method} with action ${action} not allowed`,
      },
    });
  } catch (error) {
    context.log.error("Join request management error:", error);

    context.res.status = 500;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error occurred",
      },
    });
  }
};
