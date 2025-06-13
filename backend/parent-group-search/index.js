const { v4: uuidv4 } = require("uuid");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock data storage (replace with actual database in production)
let mockSchools = [
  {
    id: "tesla-stem-redmond",
    name: "Tesla Stem High School",
    address: "18700 NE 68th St, Redmond, WA 98052",
    location: { latitude: 47.674, longitude: -122.1215 },
    district: "Lake Washington School District",
    type: "high",
    grades: ["9", "10", "11", "12"],
  },
  {
    id: "school-1",
    name: "Tesla STEM High School",
    location: { latitude: 47.674, longitude: -122.1215 },
  },
  {
    id: "school-2",
    name: "Washington Middle School",
    location: { latitude: 39.7965, longitude: -89.644 },
  },
  {
    id: "school-3",
    name: "Roosevelt High School",
    location: { latitude: 39.8014, longitude: -89.6298 },
  },
];

let mockCarpoolGroups = [
  {
    id: "group-tesla-1",
    name: "Tesla Stem Morning Commute",
    description:
      "Reliable morning carpool for Tesla Stem High School families in Redmond area",
    tripAdminId: "trip-admin-tesla-1",
    tripAdmin: {
      id: "trip-admin-tesla-1",
      firstName: "Jennifer",
      lastName: "Smith",
      email: "jennifer.smith@example.com",
    },
    targetSchoolId: "tesla-stem-redmond",
    targetSchool: {
      id: "tesla-stem-redmond",
      name: "Tesla Stem High School",
      location: { latitude: 47.674, longitude: -122.1215 },
    },
    serviceArea: {
      centerLocation: {
        latitude: 47.674,
        longitude: -122.1215,
        address: "Tesla Stem High School, Redmond, WA",
      },
      radiusMiles: 25.0, // 25-mile radius as specified
    },
    maxChildren: 8,
    ageGroups: ["9", "10", "11", "12"],
    schedule: {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      morningPickup: {
        startTime: "07:00",
        endTime: "07:45",
      },
    },
    status: "active",
    isAcceptingMembers: true,
    memberCount: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "group-1",
    name: "Tesla STEM Morning Commute",
    description: "Reliable morning carpool for Tesla STEM High School families",
    tripAdminId: "trip-admin-1",
    tripAdmin: {
      id: "trip-admin-1",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@example.com",
    },
    targetSchoolId: "school-1",
    targetSchool: {
      id: "school-1",
      name: "Tesla STEM High School",
      location: { latitude: 47.674, longitude: -122.1215 },
    },
    serviceArea: {
      centerLocation: {
        latitude: 47.674,
        longitude: -122.1215,
        address: "Tesla STEM High School area",
      },
      radiusMiles: 3.0,
    },
    maxChildren: 6,
    ageGroups: ["K", "1", "2", "3", "4", "5"],
    schedule: {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      morningPickup: {
        startTime: "07:30",
        endTime: "08:00",
      },
      afternoonDropoff: {
        startTime: "15:00",
        endTime: "15:30",
      },
    },
    status: "active",
    isAcceptingMembers: true,
    memberCount: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: "group-2",
    name: "Washington Afternoon Express",
    description: "After-school pickup group for working parents",
    tripAdminId: "trip-admin-2",
    tripAdmin: {
      id: "trip-admin-2",
      firstName: "Mike",
      lastName: "Chen",
      email: "mike.chen@example.com",
    },
    targetSchoolId: "school-2",
    targetSchool: {
      id: "school-2",
      name: "Washington Middle School",
      location: { latitude: 39.7965, longitude: -89.644 },
    },
    serviceArea: {
      centerLocation: {
        latitude: 39.7965,
        longitude: -89.644,
        address: "Washington Middle School area",
      },
      radiusMiles: 4.0,
    },
    maxChildren: 8,
    ageGroups: ["6", "7", "8"],
    schedule: {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      afternoonDropoff: {
        startTime: "15:45",
        endTime: "16:30",
      },
    },
    status: "active",
    isAcceptingMembers: true,
    memberCount: 6,
    createdAt: new Date().toISOString(),
  },
  {
    id: "group-3",
    name: "Roosevelt High Commuters",
    description: "High school carpool with flexible timing",
    tripAdminId: "trip-admin-3",
    tripAdmin: {
      id: "trip-admin-3",
      firstName: "Lisa",
      lastName: "Rodriguez",
      email: "lisa.rodriguez@example.com",
    },
    targetSchoolId: "school-3",
    targetSchool: {
      id: "school-3",
      name: "Roosevelt High School",
      location: { latitude: 39.8014, longitude: -89.6298 },
    },
    serviceArea: {
      centerLocation: {
        latitude: 39.8014,
        longitude: -89.6298,
        address: "Roosevelt High School area",
      },
      radiusMiles: 5.0,
    },
    maxChildren: 4,
    ageGroups: ["9", "10", "11", "12"],
    schedule: {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      morningPickup: {
        startTime: "07:00",
        endTime: "07:45",
      },
      afternoonDropoff: {
        startTime: "15:30",
        endTime: "16:15",
      },
    },
    status: "active",
    isAcceptingMembers: false, // Full capacity
    memberCount: 4,
    createdAt: new Date().toISOString(),
  },
];

let mockJoinRequests = [];

// Mock users for registration validation
let mockRegisteredUsers = [
  {
    id: "parent-123",
    email: "john.parent@example.com",
    firstName: "John",
    lastName: "Parent",
    role: "parent",
    phoneNumber: "+1-555-0123",
    phoneNumberVerified: true,
    homeAddress: "123 Main St, Redmond, WA 98052",
    homeAddressVerified: true,
    emergencyContactVerified: true,
    onboardingComplete: true,
    registrationComplete: true,
    familyId: "family-123",
    canAccessGroups: true,
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: "parent-456",
    email: "incomplete.user@example.com",
    firstName: "Incomplete",
    lastName: "User",
    role: "parent",
    phoneNumber: "+1-555-0456",
    phoneNumberVerified: false,
    homeAddress: null,
    homeAddressVerified: false,
    emergencyContactVerified: false,
    onboardingComplete: false,
    registrationComplete: false,
    familyId: null,
    canAccessGroups: false,
    createdAt: new Date().toISOString(),
  },
];

// Registration validation function
function validateRegistrationRequirement(userId) {
  const user = mockRegisteredUsers.find((u) => u.id === userId);

  if (!user) {
    return {
      isValid: false,
      errorCode: "USER_NOT_FOUND",
      message: "User not found. Please register first.",
      requiresRegistration: true,
    };
  }

  if (!user.registrationComplete) {
    return {
      isValid: false,
      errorCode: "REGISTRATION_INCOMPLETE",
      message:
        "Please complete your registration before accessing carpool groups.",
      requiresRegistration: true,
      missingRequirements: getMissingRequirements(user),
    };
  }

  if (!user.phoneNumberVerified) {
    return {
      isValid: false,
      errorCode: "PHONE_NOT_VERIFIED",
      message: "Please verify your phone number to access carpool groups.",
      requiresVerification: true,
    };
  }

  if (!user.homeAddressVerified) {
    return {
      isValid: false,
      errorCode: "ADDRESS_NOT_VERIFIED",
      message: "Please verify your home address to access carpool groups.",
      requiresVerification: true,
    };
  }

  if (!user.emergencyContactVerified) {
    return {
      isValid: false,
      errorCode: "EMERGENCY_CONTACT_NOT_VERIFIED",
      message:
        "Please add and verify emergency contacts to access carpool groups.",
      requiresVerification: true,
    };
  }

  if (!user.canAccessGroups) {
    return {
      isValid: false,
      errorCode: "ACCESS_RESTRICTED",
      message:
        "Your account is not yet approved for group access. Please contact support.",
      requiresApproval: true,
    };
  }

  return {
    isValid: true,
    user: user,
    message: "Registration validation successful",
  };
}

function getMissingRequirements(user) {
  const missing = [];

  if (!user.phoneNumber) missing.push("phone_number");
  if (!user.phoneNumberVerified) missing.push("phone_verification");
  if (!user.homeAddress) missing.push("home_address");
  if (!user.homeAddressVerified) missing.push("address_verification");
  if (!user.emergencyContactVerified) missing.push("emergency_contacts");
  if (!user.familyId) missing.push("family_setup");

  return missing;
}

// Utility function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// Calculate match score based on various criteria
function calculateMatchScore(group, searchCriteria, userLocation) {
  let score = 0;
  let reasons = [];

  // Distance scoring (40 points max)
  if (userLocation && group.targetSchool?.location) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      group.serviceArea.centerLocation.latitude,
      group.serviceArea.centerLocation.longitude
    );

    if (distance <= group.serviceArea.radiusMiles) {
      const distanceScore = Math.max(0, 40 - distance * 4); // Closer = higher score
      score += distanceScore;
      reasons.push(`Within service area (${distance.toFixed(1)} miles)`);
    }
  }

  // School match (30 points)
  if (
    searchCriteria.schoolId &&
    group.targetSchoolId === searchCriteria.schoolId
  ) {
    score += 30;
    reasons.push("Exact school match");
  } else if (
    searchCriteria.schoolName &&
    group.targetSchool?.name
      .toLowerCase()
      .includes(searchCriteria.schoolName.toLowerCase())
  ) {
    score += 20;
    reasons.push("School name match");
  }

  // Age group compatibility (20 points)
  if (searchCriteria.ageGroups && searchCriteria.ageGroups.length > 0) {
    const ageIntersection = searchCriteria.ageGroups.filter((age) =>
      group.ageGroups.includes(age)
    );
    if (ageIntersection.length > 0) {
      score += 20;
      reasons.push(`Compatible age groups (${ageIntersection.join(", ")})`);
    }
  }

  // Schedule compatibility (10 points)
  if (searchCriteria.daysOfWeek && searchCriteria.daysOfWeek.length > 0) {
    const dayIntersection = searchCriteria.daysOfWeek.filter((day) =>
      group.schedule.daysOfWeek.includes(day)
    );
    if (dayIntersection.length > 0) {
      score += 10;
      reasons.push(`Compatible schedule (${dayIntersection.length} days)`);
    }
  }

  return { score, reasons };
}

module.exports = async function (context, req) {
  context.log("Parent group search function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Authentication check for protected routes
    const authHeader = req.headers.authorization;
    const method = req.method;
    const action = req.query.action;

    if (method === "GET" && action === "search") {
      // GROUP SEARCH NOW REQUIRES REGISTRATION - Updated requirement
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        context.res = UnifiedResponseHandler.authError(
          "You must be logged in to search for carpool groups."
        );
        return;
      }

      // Extract user ID from token (mock - in production, decode JWT)
      const token = authHeader.split(" ")[1];
      const userId = "parent-123"; // In production, extract from JWT

      // Validate registration requirements
      const registrationValidation = validateRegistrationRequirement(userId);

      if (!registrationValidation.isValid) {
        context.res = UnifiedResponseHandler.forbiddenError(
          registrationValidation.message || "Registration validation failed"
        );
        return;
      }

      // User is properly registered - proceed with search
      const user = registrationValidation.user;
      const {
        schoolId,
        schoolName,
        userLat,
        userLng,
        maxDistanceMiles = 10,
        ageGroups,
        daysOfWeek,
        morningPickup,
        afternoonDropoff,
      } = req.query;

      // Build search criteria
      const searchCriteria = {
        schoolId,
        schoolName,
        maxDistanceMiles: parseFloat(maxDistanceMiles),
        ageGroups: ageGroups ? ageGroups.split(",") : [],
        daysOfWeek: daysOfWeek ? daysOfWeek.split(",") : [],
        timePreferences: {
          morningPickup: morningPickup === "true",
          afternoonDropoff: afternoonDropoff === "true",
        },
      };

      // Use user's verified home address for location-based search if not provided
      const userLocation =
        userLat && userLng
          ? { latitude: parseFloat(userLat), longitude: parseFloat(userLng) }
          : user.homeAddressVerified
          ? { latitude: 47.674, longitude: -122.1215 } // Tesla Stem High School area for demo
          : null;

      // Filter and score groups
      let results = mockCarpoolGroups
        .filter((group) => group.status === "active") // Only active groups
        .map((group) => {
          const distance = userLocation
            ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                group.serviceArea.centerLocation.latitude,
                group.serviceArea.centerLocation.longitude
              )
            : null;

          const { score, reasons } = calculateMatchScore(
            group,
            searchCriteria,
            userLocation
          );

          return {
            group: {
              ...group,
              // Remove sensitive data for public search
              tripAdmin: {
                firstName: group.tripAdmin.firstName,
                lastName: group.tripAdmin.lastName,
              },
            },
            matchScore: score,
            distance,
            matchReasons: reasons,
            canRequestToJoin:
              group.isAcceptingMembers && group.memberCount < group.maxChildren,
          };
        })
        .filter((result) => {
          // Apply distance filter
          if (
            userLocation &&
            result.distance > searchCriteria.maxDistanceMiles
          ) {
            return false;
          }
          // Minimum match score threshold
          return result.matchScore >= 20;
        })
        .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          results,
          total: results.length,
          searchCriteria,
          userInfo: {
            registrationComplete: true,
            hasVerifiedAddress: user.homeAddressVerified,
            hasVerifiedPhone: user.phoneNumberVerified,
            hasEmergencyContacts: user.emergencyContactVerified,
          },
          message: "Group search completed successfully",
        },
      });
      return;
    }

    // Authentication required for all other endpoints
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
    if (!token.includes("parent") && !token.includes("admin")) {
      context.res.status = 403;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Parent access required",
        },
      });
      return;
    }

    // Extract user ID and validate registration for protected actions
    const userId = "parent-123"; // In production, extract from JWT
    const registrationValidation = validateRegistrationRequirement(userId);

    if (!registrationValidation.isValid) {
      context.res.status = 403;
      context.res.body = JSON.stringify({
        success: false,
        error: registrationValidation,
      });
      return;
    }

    if (method === "POST" && action === "join-request") {
      // Submit join request to a group - requires full registration
      const { groupId, message, childrenInfo } = req.body;

      // Validation
      if (!groupId) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Group ID is required",
          },
        });
        return;
      }

      // Find the group
      const group = mockCarpoolGroups.find((g) => g.id === groupId);
      if (!group) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Carpool group not found",
          },
        });
        return;
      }

      // Check if group is accepting members
      if (!group.isAcceptingMembers) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "GROUP_NOT_ACCEPTING",
            message: "This group is not currently accepting new members",
          },
        });
        return;
      }

      // Extract user ID from token (mock)
      const userId = "parent-123"; // In production, extract from JWT

      // RULE 1: Check if any children are already in other groups (Single Group Membership)
      if (childrenInfo && childrenInfo.length > 0) {
        const childrenNames = childrenInfo.map((child) =>
          child.name.toLowerCase()
        );

        // Check against all approved join requests in other groups
        const existingChildMemberships = mockJoinRequests.filter(
          (r) =>
            r.status === "approved" &&
            r.groupId !== groupId &&
            r.childrenInfo?.some((child) =>
              childrenNames.includes(child.name.toLowerCase())
            )
        );

        if (existingChildMemberships.length > 0) {
          const conflictingChildren = [];
          const conflictingGroups = [];

          existingChildMemberships.forEach((r) => {
            const conflicts = r.childrenInfo?.filter((child) =>
              childrenNames.includes(child.name.toLowerCase())
            );
            if (conflicts) {
              conflictingChildren.push(...conflicts.map((c) => c.name));
              if (r.group?.name) conflictingGroups.push(r.group.name);
            }
          });

          context.res.status = 400;
          context.res.body = JSON.stringify({
            success: false,
            error: {
              code: "CHILD_ALREADY_ENROLLED",
              message:
                "One or more children are already members of another carpool group. Each child can only be in one group at a time.",
              details: {
                conflictingChildren: [...new Set(conflictingChildren)],
                conflictingGroups: [...new Set(conflictingGroups)],
                policy:
                  "To join this group, you must first leave your current group for the affected children.",
              },
            },
          });
          return;
        }
      }

      // Check for duplicate request
      const existingRequest = mockJoinRequests.find(
        (r) =>
          r.groupId === groupId &&
          r.requesterId === userId &&
          r.status === "pending"
      );
      if (existingRequest) {
        context.res.status = 409;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "DUPLICATE_REQUEST",
            message: "You already have a pending request for this group",
          },
        });
        return;
      }

      // Create join request
      const joinRequest = {
        id: uuidv4(),
        groupId,
        group: {
          id: group.id,
          name: group.name,
          targetSchool: group.targetSchool,
        },
        requesterId: userId,
        requester: {
          id: userId,
          firstName: "John", // Mock data
          lastName: "Parent",
          email: "john.parent@example.com",
        },
        status: "pending",
        message: message || "",
        childrenInfo: childrenInfo || [],
        requestedAt: new Date().toISOString(),
      };

      // Store join request
      mockJoinRequests.push(joinRequest);

      context.res.status = 201;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          joinRequest,
          message:
            "Join request submitted successfully. The Group Admin will review your request.",
        },
      });
      return;
    }

    if (method === "GET" && action === "my-requests") {
      // Get user's join requests
      const userId = "parent-123"; // In production, extract from JWT

      const userRequests = mockJoinRequests
        .filter((r) => r.requesterId === userId)
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          requests: userRequests,
          total: userRequests.length,
          message: "Join requests retrieved successfully",
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
    context.log.error("Parent group search error:", error);

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
