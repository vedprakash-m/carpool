const { v4: uuidv4 } = require("uuid");
const { MockDataFactory } = require("../src/utils/mock-data-wrapper");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Carpool Groups API called");

  // Handle preflight requests
  const preflightResponse = UnifiedResponseHandler.handlePreflight(req);
  if (preflightResponse) {
    context.res = preflightResponse;
    return;
  }

  try {
    const method = req.method;
    const { groupId } = req.params || {};

    // Validate authorization
    const authError = UnifiedResponseHandler.validateAuth(req);
    if (authError) {
      context.res = authError;
      return;
    }

    // Route based on method
    switch (method) {
      case "GET":
        const getResult = groupId
          ? await getGroupDetails(groupId, context)
          : await getGroups(context);
        context.res = getResult;
        return;
      case "POST":
        const body = UnifiedResponseHandler.parseJsonBody(req);
        const { action } = body;
        if (action === "family-departure") {
          context.res = await handleFamilyDeparture(groupId, body, context);
        } else if (action === "intra-family-reassignment") {
          context.res = await handleIntraFamilyReassignment(
            groupId,
            body,
            context
          );
        } else {
          context.res = await createGroup(body, context);
        }
        return;
      case "PUT":
        const updateBody = UnifiedResponseHandler.parseJsonBody(req);
        context.res = await updateGroup(groupId, updateBody, context);
        return;
      case "DELETE":
        context.res = await deleteGroup(groupId, context);
        return;
      default:
        context.res =
          UnifiedResponseHandler.methodNotAllowedError("Method not allowed");
        return;
    }
  } catch (error) {
    context.res = UnifiedResponseHandler.internalError(
      "Failed to process carpool groups request",
      error.message
    );
  }
};

// Get all groups
async function getGroups(context) {
  try {
    const mockGroups = getMockGroups();
    return UnifiedResponseHandler.success(mockGroups);
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
      return createErrorResponse(
        "GROUP_NOT_FOUND",
        "Carpool group not found",
        404
      );
    }

    return createSuccessResponse(group);
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

    const validationError = UnifiedResponseHandler.validateRequiredFields(
      groupData,
      ["name", "school", "pickupLocation", "dropoffLocation"]
    );
    if (validationError) {
      return validationError;
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

    return UnifiedResponseHandler.created(
      newGroup,
      "Carpool group created successfully"
    );
  } catch (error) {
    context.log.error("Create group error:", error);
    throw error;
  }
}

// Update group
async function updateGroup(groupId, updateData, context) {
  try {
    return UnifiedResponseHandler.success(
      { id: groupId, ...updateData },
      "Group updated successfully"
    );
  } catch (error) {
    context.log.error("Update group error:", error);
    throw error;
  }
}

// Delete group
async function deleteGroup(groupId, context) {
  try {
    return UnifiedResponseHandler.success(null, "Group deleted successfully");
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
      return UnifiedResponseHandler.validationError(
        "Missing required fields: userId and confirmDeparture"
      );
    }

    // Find the group
    const mockGroups = getMockGroups();
    const groupIndex = mockGroups.findIndex((g) => g.id === groupId);

    if (groupIndex === -1) {
      return UnifiedResponseHandler.notFoundError("Group not found");
    }

    const group = mockGroups[groupIndex];

    // Find the departing parent and their family members
    const drivingParent = group.members.find(
      (m) => m.userId === userId && m.role === "parent" && m.canDrive
    );

    if (!drivingParent) {
      return UnifiedResponseHandler.notFoundError(
        "Driving parent not found in this group"
      );
    }

    // FAMILY CASCADE DEPARTURE: Find all family members
    const familyMembers = group.members.filter(
      (m) =>
        m.userId === userId || // driving parent
        m.userId === `${userId}-spouse` || // non-driving spouse
        m.parentId === userId // children
    );

    if (familyMembers.length === 0) {
      return UnifiedResponseHandler.notFoundError(
        "No family members found in this group"
      );
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

    return UnifiedResponseHandler.success(
      {
        departure: departureDetails,
        updatedGroup: mockGroups[groupIndex],
      },
      `Family departure completed. ${familyMembers.length} members removed from "${group.name}". Group Admin has been notified.`
    );
  } catch (error) {
    context.log.error("Family departure error:", error);
    throw error;
  }
}

// Handle intra-family trip reassignment (Rule 3: Non-swap family coordination)
async function handleIntraFamilyReassignment(groupId, requestData, context) {
  try {
    const { fromParentId, toParentId, assignmentId, reason } = requestData;

    if (!fromParentId || !toParentId || !assignmentId) {
      return UnifiedResponseHandler.validationError(
        "From parent, to parent, and assignment ID are required"
      );
    }

    // Verify both parents are from same family
    const fromFamilyId = fromParentId.split("-spouse")[0];
    const toFamilyId = toParentId.split("-spouse")[0];

    if (fromFamilyId !== toFamilyId) {
      return UnifiedResponseHandler.validationError(
        "Intra-family reassignment only allowed between spouses/same family"
      );
    }

    // Find the group
    const mockGroups = getMockGroups();
    const group = mockGroups.find((g) => g.id === groupId);

    if (!group) {
      return UnifiedResponseHandler.notFoundError("Carpool group not found");
    }

    // Find both parents in group
    const fromParent = group.members.find(
      (m) => m.userId === fromParentId && m.role === "parent"
    );
    const toParent = group.members.find(
      (m) => m.userId === toParentId && m.role === "parent"
    );

    if (!fromParent || !toParent) {
      return UnifiedResponseHandler.notFoundError(
        "One or both parents not found in this group"
      );
    }

    // Verify receiving parent can drive
    if (!toParent.canDrive) {
      return UnifiedResponseHandler.validationError(
        "Receiving parent is not designated as a driving parent"
      );
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

    return UnifiedResponseHandler.success(
      {
        reassignment: reassignmentRecord,
        notification: {
          message: notificationMessage,
          type: "family_reassignment",
          sentToGroup: true,
          timestamp: new Date().toISOString(),
        },
      },
      "Trip successfully reassigned within family"
    );
  } catch (error) {
    context.log.error("Intra-family reassignment error:", error);
    throw error;
  }
}

// Mock data for development using centralized factory
function getMockGroups() {
  return MockDataFactory.createGroups();
}
