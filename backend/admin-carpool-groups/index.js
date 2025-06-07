const { v4: uuidv4 } = require("uuid");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

module.exports = async function (context, req) {
  context.log("Carpool Groups API called");

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
    const method = req.method;
    const { groupId } = req.params || {};

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

    // Route based on method
    switch (method) {
      case "GET":
        return groupId ? getGroupDetails(groupId, context) : getGroups(context);
      case "POST":
        const { action } = req.body;
        if (action === "family-departure") {
          return handleFamilyDeparture(groupId, req.body, context);
        }
        if (action === "intra-family-reassignment") {
          return handleIntraFamilyReassignment(groupId, req.body, context);
        }
        return createGroup(req.body, context);
      case "PUT":
        return updateGroup(groupId, req.body, context);
      case "DELETE":
        return deleteGroup(groupId, context);
      default:
        return {
          status: 405,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: "Method not allowed",
            },
          }),
        };
    }
  } catch (error) {
    context.log.error("Carpool Groups API error:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error occurred",
        },
      }),
    };
  }
};

// Get all groups
async function getGroups(context) {
  try {
    const mockGroups = getMockGroups();
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: mockGroups }),
    };
  } catch (error) {
    context.log.error("Get groups error:", error);
    throw error;
  }
}

// Get group details
async function getGroupDetails(groupId, context) {
  try {
    const mockGroups = getMockGroups();
    const group = mockGroups.find((g) => g.id === groupId);

    if (!group) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "GROUP_NOT_FOUND",
            message: "Carpool group not found",
          },
        }),
      };
    }

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: group }),
    };
  } catch (error) {
    context.log.error("Get group details error:", error);
    throw error;
  }
}

// Create new group
async function createGroup(groupData, context) {
  try {
    const {
      name,
      description,
      school,
      pickupLocation,
      dropoffLocation,
      maxMembers,
      schedule,
    } = groupData;

    if (!name || !school || !pickupLocation || !dropoffLocation) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
          },
        }),
      };
    }

    const newGroup = {
      id: uuidv4(),
      name,
      description: description || "",
      school,
      pickupLocation,
      dropoffLocation,
      maxMembers: maxMembers || 8,
      currentMembers: 0,
      status: "active",
      schedule: schedule || { days: [], startTime: "07:30", endTime: "08:30" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminId: "admin-123",
      members: [],
      invitations: [],
    };

    return {
      status: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: newGroup,
        message: "Carpool group created successfully",
      }),
    };
  } catch (error) {
    context.log.error("Create group error:", error);
    throw error;
  }
}

// Update group
async function updateGroup(groupId, updateData, context) {
  try {
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: { id: groupId, ...updateData },
        message: "Group updated successfully",
      }),
    };
  } catch (error) {
    context.log.error("Update group error:", error);
    throw error;
  }
}

// Delete group
async function deleteGroup(groupId, context) {
  try {
    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Group deleted successfully",
      }),
    };
  } catch (error) {
    context.log.error("Delete group error:", error);
    throw error;
  }
}

// Handle family departure cascade (Rule 2: Driving Parent Departure Cascade)
async function handleFamilyDeparture(groupId, requestData, context) {
  try {
    const { userId, reason, confirmDeparture } = requestData;

    if (!userId || !confirmDeparture) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "User ID and departure confirmation are required",
          },
        }),
      };
    }

    // Find the group
    const mockGroups = getMockGroups();
    const groupIndex = mockGroups.findIndex((g) => g.id === groupId);

    if (groupIndex === -1) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "GROUP_NOT_FOUND",
            message: "Carpool group not found",
          },
        }),
      };
    }

    const group = mockGroups[groupIndex];

    // Find the departing parent and their family members
    const drivingParent = group.members.find(
      (m) => m.userId === userId && m.role === "parent" && m.canDrive
    );

    if (!drivingParent) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "MEMBER_NOT_FOUND",
            message: "Driving parent not found in this group",
          },
        }),
      };
    }

    // FAMILY CASCADE DEPARTURE: Find all family members
    const familyMembers = group.members.filter(
      (m) =>
        m.userId === userId || // driving parent
        m.userId === `${userId}-spouse` || // non-driving spouse
        m.parentId === userId // children
    );

    if (familyMembers.length === 0) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "NO_FAMILY_MEMBERS",
            message: "No family members found in this group",
          },
        }),
      };
    }

    // Remove all family members from the group
    const remainingMembers = group.members.filter(
      (m) => !familyMembers.find((fm) => fm.id === m.id)
    );

    // Update group data
    mockGroups[groupIndex] = {
      ...group,
      members: remainingMembers,
      currentMembers: remainingMembers.length,
      updatedAt: new Date().toISOString(),
    };

    // Prepare departure notification details
    const departureDetails = {
      groupName: group.name,
      familyName: `${drivingParent.name.split(" ")[0]} Family`,
      departedMembers: familyMembers.map((m) => ({
        name: m.name,
        role: m.role,
        grade: m.grade || null,
      })),
      reason: reason || "No reason provided",
      departureDate: new Date().toISOString(),
      gracePeriodEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      remainingCapacity: group.maxMembers - remainingMembers.length,
      tripAdminNotified: true,
    };

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          departure: departureDetails,
          updatedGroup: mockGroups[groupIndex],
        },
        message: `Family departure completed. ${familyMembers.length} members removed from "${group.name}". Trip Admin has been notified.`,
      }),
    };
  } catch (error) {
    context.log.error("Family departure error:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Error processing family departure",
        },
      }),
    };
  }
}

// Handle intra-family trip reassignment (Rule 3: Non-swap family coordination)
async function handleIntraFamilyReassignment(groupId, requestData, context) {
  try {
    const { fromParentId, toParentId, assignmentId, reason } = requestData;

    if (!fromParentId || !toParentId || !assignmentId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "From parent, to parent, and assignment ID are required",
          },
        }),
      };
    }

    // Verify both parents are from same family
    const fromFamilyId = fromParentId.split("-spouse")[0];
    const toFamilyId = toParentId.split("-spouse")[0];

    if (fromFamilyId !== toFamilyId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "NOT_SAME_FAMILY",
            message:
              "Intra-family reassignment only allowed between spouses/same family",
          },
        }),
      };
    }

    // Find the group
    const mockGroups = getMockGroups();
    const group = mockGroups.find((g) => g.id === groupId);

    if (!group) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "GROUP_NOT_FOUND",
            message: "Carpool group not found",
          },
        }),
      };
    }

    // Find both parents in group
    const fromParent = group.members.find(
      (m) => m.userId === fromParentId && m.role === "parent"
    );
    const toParent = group.members.find(
      (m) => m.userId === toParentId && m.role === "parent"
    );

    if (!fromParent || !toParent) {
      return {
        status: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "PARENTS_NOT_FOUND",
            message: "One or both parents not found in this group",
          },
        }),
      };
    }

    // Verify receiving parent can drive
    if (!toParent.canDrive) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "RECEIVER_CANNOT_DRIVE",
            message: "Receiving parent is not designated as a driving parent",
          },
        }),
      };
    }

    // Mock: Update assignment (in production, would update actual schedule)
    const reassignmentRecord = {
      id: `reassignment-${Date.now()}`,
      groupId,
      assignmentId,
      fromParentId,
      fromParentName: fromParent.name,
      toParentId,
      toParentName: toParent.name,
      reason: reason || "Family coordination",
      type: "intra-family",
      processedAt: new Date().toISOString(),
      notificationSent: true,
    };

    // Generate group notification message
    const notificationMessage = `Schedule Update: ${toParent.name} will now drive instead of ${fromParent.name} (family reassignment)`;

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          reassignment: reassignmentRecord,
          notification: {
            message: notificationMessage,
            type: "family_reassignment",
            sentToGroup: true,
            timestamp: new Date().toISOString(),
          },
        },
        message: "Trip successfully reassigned within family",
      }),
    };
  } catch (error) {
    context.log.error("Intra-family reassignment error:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process intra-family reassignment",
        },
      }),
    };
  }
}

// Mock data for development and testing - all emails and data are fake examples
function getMockGroups() {
  return [
    {
      id: "group-1",
      name: "Lincoln Elementary Morning Carpool",
      description:
        "Daily morning drop-off carpool for Lincoln Elementary School",
      school: "Lincoln Elementary School",
      pickupLocation: "Maple Street Neighborhood",
      dropoffLocation: "Lincoln Elementary School",
      maxMembers: 8,
      currentMembers: 5,
      status: "active",
      schedule: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "07:30",
        endTime: "08:30",
      },
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      adminId: "admin-123",
      members: [
        {
          id: "member-1",
          userId: "parent-1",
          name: "Sarah Johnson",
          email: "mock.parent1@example.com", // Mock data for testing
          role: "parent",
          joinedAt: "2025-01-01T00:00:00Z",
          children: [
            { id: "child-1", name: "Emma Johnson", grade: "3rd" },
            { id: "child-2", name: "Jake Johnson", grade: "1st" },
          ],
        },
        {
          id: "member-2",
          userId: "parent-2",
          name: "Michael Chen",
          email: "mock.parent2@example.com", // Mock data for testing
          role: "parent",
          joinedAt: "2025-01-02T00:00:00Z",
          children: [{ id: "child-3", name: "Lucas Chen", grade: "2nd" }],
        },
      ],
      invitations: [
        {
          id: "invite-1",
          email: "mock.newparent@example.com", // Mock data for testing
          name: "Jennifer Davis",
          role: "parent",
          status: "pending",
          sentAt: "2025-01-05T00:00:00Z",
          expiresAt: "2025-01-12T00:00:00Z",
          message: "Join our morning carpool group!",
        },
      ],
    },
    {
      id: "group-2",
      name: "Lincoln Elementary Afternoon Pickup",
      description:
        "Daily afternoon pickup carpool for Lincoln Elementary School",
      school: "Lincoln Elementary School",
      pickupLocation: "Lincoln Elementary School",
      dropoffLocation: "Oak Avenue Neighborhood",
      maxMembers: 6,
      currentMembers: 3,
      status: "active",
      schedule: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "15:00",
        endTime: "16:00",
      },
      createdAt: "2025-01-02T00:00:00Z",
      updatedAt: "2025-01-02T00:00:00Z",
      adminId: "admin-123",
      members: [
        {
          id: "member-3",
          userId: "parent-3",
          name: "Jennifer Davis",
          email: "mock.parent3@example.com", // Mock data for testing
          role: "parent",
          joinedAt: "2025-01-02T00:00:00Z",
          children: [{ id: "child-4", name: "Sophie Davis", grade: "4th" }],
        },
      ],
      invitations: [],
    },
  ];
}
