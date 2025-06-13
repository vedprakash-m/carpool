const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

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
        name: "Tesla STEM High School",
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
      "Hi! I'm looking for a reliable carpool for my daughter Emma (Grade 2). I live 2 miles from the school and would love to join your group. I have a clean driving record and can help with driving duties.",
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
        name: "Tesla STEM High School",
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
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError("Authentication required");
      return;
    }

    // Simple token validation (replace with actual JWT validation)
    const token = authHeader.split(" ")[1];
    if (!token.includes("trip_admin") && !token.includes("admin")) {
      context.res = UnifiedResponseHandler.forbiddenError(
        "Group Admin access required"
      );
      return;
    }

    const method = req.method;
    const action = req.query.action;
    const requestId = req.query.id;

    // Extract Group Admin ID from token (mock)
    const tripAdminId = "trip-admin-1"; // In production, extract from JWT

    if (method === "GET" && !action) {
      // Get all join requests for Group Admin's groups
      const { status, groupId, limit = 50, offset = 0 } = req.query;

      // Get groups managed by this Group Admin
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

      context.res = UnifiedResponseHandler.success(
        {
          requests: paginatedRequests,
          total,
          pending: filteredRequests.filter((r) => r.status === "pending")
            .length,
          approved: filteredRequests.filter((r) => r.status === "approved")
            .length,
          denied: filteredRequests.filter((r) => r.status === "denied").length,
          groups: adminGroups,
        },
        "Join requests retrieved successfully"
      );
      return;
    }

    if (method === "GET" && requestId) {
      // Get specific join request details
      const request = mockJoinRequests.find((r) => r.id === requestId);

      if (!request) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Join request not found"
        );
        return;
      }

      // Verify Group Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only view requests for your own groups"
        );
        return;
      }

      context.res = UnifiedResponseHandler.success(
        { request },
        "Join request retrieved successfully"
      );
      return;
    }

    if (method === "PUT" && action === "approve") {
      // Approve a join request
      const { requestId, reviewMessage } = req.body;

      if (!requestId) {
        context.res = UnifiedResponseHandler.validationError(
          "Request ID is required"
        );
        return;
      }

      const requestIndex = mockJoinRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Join request not found"
        );
        return;
      }

      const request = mockJoinRequests[requestIndex];

      // Verify Group Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only approve requests for your own groups"
        );
        return;
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        context.res = UnifiedResponseHandler.validationError(
          "Only pending requests can be approved"
        );
        return;
      }

      // FAMILY UNIT MEMBERSHIP: Calculate total family member impact
      const childrenCount = request.childrenInfo?.length || 1;
      const drivingParent = 1; // The requesting parent
      const nonDrivingParent = request.hasSpouse ? 1 : 0; // Assume spouse exists if mentioned in request
      const totalFamilyMembers =
        drivingParent + nonDrivingParent + childrenCount;

      // Check if any children are already in other groups (Rule 1: Single Group Membership)
      const childrenNames =
        request.childrenInfo?.map((child) => child.name.toLowerCase()) || [];
      const existingChildMemberships = mockJoinRequests.filter(
        (r) =>
          r.status === "approved" &&
          r.groupId !== request.groupId &&
          r.childrenInfo?.some((child) =>
            childrenNames.includes(child.name.toLowerCase())
          )
      );

      if (existingChildMemberships.length > 0) {
        context.res = UnifiedResponseHandler.validationError(
          "One or more children are already members of another carpool group. Each child can only be in one group at a time.",
          {
            conflictingGroups: existingChildMemberships
              .map((r) => r.group?.name)
              .filter(Boolean),
            affectedChildren: existingChildMemberships.flatMap((r) =>
              r.childrenInfo
                ?.filter((child) =>
                  childrenNames.includes(child.name.toLowerCase())
                )
                .map((child) => child.name)
            ),
          }
        );
        return;
      }

      // Check group capacity for entire family unit
      if (group.memberCount + totalFamilyMembers > group.maxChildren) {
        context.res = UnifiedResponseHandler.validationError(
          `Adding the entire ${request.requester.firstName} family (${totalFamilyMembers} members) would exceed group capacity (${group.maxChildren} max).`,
          {
            currentCapacity: group.memberCount,
            maxCapacity: group.maxChildren,
            familySize: totalFamilyMembers,
            breakdown: {
              drivingParent: drivingParent,
              nonDrivingParent: nonDrivingParent,
              children: childrenCount,
            },
          }
        );
        return;
      }

      // FAMILY CASCADE APPROVAL: Update request with family unit details
      mockJoinRequests[requestIndex] = {
        ...request,
        status: "approved",
        reviewedBy: tripAdminId,
        reviewedByUser: {
          id: tripAdminId,
          firstName: "Sarah", // Mock data
          lastName: "Johnson",
        },
        reviewMessage:
          reviewMessage ||
          `Welcome to the group! Your entire family (${totalFamilyMembers} members) has been added.`,
        reviewedAt: new Date().toISOString(),
        familyMembersAdded: {
          drivingParent: request.requester,
          nonDrivingParent: request.spouseInfo || null,
          children: request.childrenInfo || [],
          totalCount: totalFamilyMembers,
        },
      };

      // Update group member count with entire family
      const groupIndex = mockCarpoolGroups.findIndex(
        (g) => g.id === request.groupId
      );
      if (groupIndex !== -1) {
        mockCarpoolGroups[groupIndex].memberCount += totalFamilyMembers;

        // Add family members to group's member list
        if (!mockCarpoolGroups[groupIndex].members) {
          mockCarpoolGroups[groupIndex].members = [];
        }

        // Add driving parent
        mockCarpoolGroups[groupIndex].members.push({
          id: `member-${Date.now()}-driving`,
          userId: request.requesterId,
          name: `${request.requester.firstName} ${request.requester.lastName}`,
          email: request.requester.email,
          role: "parent",
          canDrive: true,
          joinedAt: new Date().toISOString(),
          children: request.childrenInfo || [],
        });

        // Add spouse/second parent if exists (can be driving or non-driving)
        if (request.spouseInfo) {
          mockCarpoolGroups[groupIndex].members.push({
            id: `member-${Date.now()}-spouse`,
            userId: `${request.requesterId}-spouse`,
            name: `${request.spouseInfo.firstName} ${request.spouseInfo.lastName}`,
            email: request.spouseInfo.email,
            role: "parent",
            canDrive: request.spouseInfo.canDrive || false, // ENHANCEMENT: Support dual driving parents
            joinedAt: new Date().toISOString(),
            children: request.childrenInfo || [],
            drivingPreferences: request.spouseInfo.canDrive
              ? {
                  preferredDays: request.spouseInfo.preferredDays || [],
                  maxPassengers: request.spouseInfo.maxPassengers || 3,
                  vehicleInfo: request.spouseInfo.vehicleInfo || "",
                }
              : undefined,
          });
        }

        // Add children as members
        (request.childrenInfo || []).forEach((child, index) => {
          mockCarpoolGroups[groupIndex].members.push({
            id: `member-${Date.now()}-child-${index}`,
            userId: `${request.requesterId}-child-${index}`,
            name: child.name,
            role: "student",
            grade: child.grade,
            joinedAt: new Date().toISOString(),
            parentId: request.requesterId,
          });
        });
      }

      context.res = UnifiedResponseHandler.success(
        { request: mockJoinRequests[requestIndex] },
        "Join request approved successfully. Parent will be notified."
      );
      return;
    }

    if (method === "PUT" && action === "deny") {
      // Deny a join request
      const { requestId, reviewMessage } = req.body;

      if (!requestId) {
        context.res = UnifiedResponseHandler.validationError(
          "Request ID is required"
        );
        return;
      }

      const requestIndex = mockJoinRequests.findIndex(
        (r) => r.id === requestId
      );
      if (requestIndex === -1) {
        context.res = UnifiedResponseHandler.notFoundError(
          "Join request not found"
        );
        return;
      }

      const request = mockJoinRequests[requestIndex];

      // Verify Group Admin owns this group
      const group = mockCarpoolGroups.find((g) => g.id === request.groupId);
      if (!group || group.tripAdminId !== tripAdminId) {
        context.res = UnifiedResponseHandler.forbiddenError(
          "You can only deny requests for your own groups"
        );
        return;
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        context.res = UnifiedResponseHandler.validationError(
          "Only pending requests can be denied"
        );
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

      context.res = UnifiedResponseHandler.success(
        { request: mockJoinRequests[requestIndex] },
        "Join request denied. Parent will be notified."
      );
      return;
    }

    if (method === "GET" && action === "stats") {
      // Get join request statistics for Group Admin
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

      context.res = UnifiedResponseHandler.success(
        { stats },
        "Join request statistics retrieved successfully"
      );
      return;
    }

    // Invalid method or action
    context.res = UnifiedResponseHandler.methodNotAllowedError(
      `Method ${method} with action ${action} not allowed`
    );
  } catch (error) {
    context.log.error("Join request management error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};
