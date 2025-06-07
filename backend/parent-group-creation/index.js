const { v4: uuidv4 } = require("uuid");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
};

// Mock data stores (in production, these would be database calls)
let mockCarpoolGroups = [
  {
    id: "group-1",
    name: "Lincoln Morning Riders",
    description: "Friendly morning carpool for Lincoln Elementary families",
    tripAdminId: "user-trip-admin",
    targetSchoolId: "school-lincoln-elem",
    targetSchool: {
      id: "school-lincoln-elem",
      name: "Lincoln Elementary School",
      address: "123 School Street, Springfield, IL 62701",
      location: { lat: 39.7817, lng: -89.6501 },
      district: "Springfield School District",
      gradesServed: ["K", "1", "2", "3", "4", "5"],
    },
    serviceArea: {
      centerLocation: { lat: 39.7817, lng: -89.6501 },
      radiusMiles: 5,
      includeZipCodes: ["62701", "62702"],
      excludeZipCodes: [],
    },
    maxChildren: 6,
    ageGroups: ["K", "1", "2", "3", "4", "5"],
    schedule: {
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      morningPickup: {
        startTime: "07:30",
        endTime: "08:00",
      },
    },
    memberCount: 4,
    members: [],
    pendingInvitations: [],
    joinRequests: [],
    status: "active",
    isAcceptingMembers: true,
    lastActivityAt: new Date(),
    activityMetrics: {
      lastPreferenceSubmission: new Date(),
      lastScheduleGeneration: new Date(),
      lastMemberActivity: new Date(),
      consecutiveInactiveWeeks: 0,
    },
    createdAt: new Date("2023-09-01"),
    updatedAt: new Date(),
  },
];

let mockUsers = [
  {
    id: "parent-123",
    email: "john.parent@example.com",
    firstName: "John",
    lastName: "Parent",
    role: "parent",
    isActiveDriver: true,
    homeAddress: "456 Oak Street, Springfield, IL 62701",
    homeLocation: { lat: 39.785, lng: -89.645 },
  },
];

let mockSchools = [
  {
    id: "school-lincoln-elem",
    name: "Lincoln Elementary School",
    address: "123 School Street, Springfield, IL 62701",
    location: { lat: 39.7817, lng: -89.6501 },
    district: "Springfield School District",
    gradesServed: ["K", "1", "2", "3", "4", "5"],
    contactInfo: {
      phone: "(217) 555-0123",
      email: "lincoln@springfield.edu",
      principal: "Dr. Sarah Johnson",
    },
  },
  {
    id: "school-washington-middle",
    name: "Washington Middle School",
    address: "789 Main Avenue, Springfield, IL 62702",
    location: { lat: 39.79, lng: -89.64 },
    district: "Springfield School District",
    gradesServed: ["6", "7", "8"],
    contactInfo: {
      phone: "(217) 555-0456",
      email: "washington@springfield.edu",
      principal: "Mr. Michael Davis",
    },
  },
];

module.exports = async function (context, req) {
  context.log("Parent Group Creation function processed a request.");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
    };
    return;
  }

  try {
    const method = req.method;
    const { action } = req.query;

    // Parse authorization header (in production, verify JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Valid authentication token required",
          },
        }),
      };
      return;
    }

    const token = authHeader.replace("Bearer ", "");
    const userId = "parent-123"; // In production, extract from JWT

    // Verify user is a parent (can create groups)
    const user = mockUsers.find((u) => u.id === userId);
    if (!user || user.role !== "parent") {
      context.res = {
        status: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only parents can create carpool groups",
          },
        }),
      };
      return;
    }

    if (method === "POST" && !action) {
      // Create new carpool group
      const {
        name,
        description,
        targetSchoolId,
        serviceArea,
        maxChildren,
        ageGroups,
        schedule,
      } = req.body;

      // Validate required fields
      if (
        !name ||
        !targetSchoolId ||
        !serviceArea ||
        !maxChildren ||
        !schedule
      ) {
        context.res = {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message:
                "Missing required fields: name, targetSchoolId, serviceArea, maxChildren, schedule",
            },
          }),
        };
        return;
      }

      // Validate school exists
      const targetSchool = mockSchools.find((s) => s.id === targetSchoolId);
      if (!targetSchool) {
        context.res = {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Target school not found",
            },
          }),
        };
        return;
      }

      // Check if user already has active groups for the same school
      const existingGroups = mockCarpoolGroups.filter(
        (g) =>
          g.tripAdminId === userId &&
          g.targetSchoolId === targetSchoolId &&
          g.status === "active"
      );

      if (existingGroups.length >= 3) {
        // Limit parents to 3 active groups per school
        context.res = {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "LIMIT_EXCEEDED",
              message: "You can only manage up to 3 active groups per school",
            },
          }),
        };
        return;
      }

      // Create new group with parent as Trip Admin
      const newGroup = {
        id: uuidv4(),
        name: name.trim(),
        description: description?.trim() || "",
        tripAdminId: userId,
        tripAdmin: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        targetSchoolId,
        targetSchool,
        serviceArea: {
          centerLocation: serviceArea.centerLocation,
          radiusMiles: Math.min(serviceArea.radiusMiles, 25), // Max 25 mile radius
          includeZipCodes: serviceArea.includeZipCodes || [],
          excludeZipCodes: serviceArea.excludeZipCodes || [],
        },
        maxChildren: Math.min(maxChildren, 12), // Maximum 12 children per group
        ageGroups: ageGroups || [],
        schedule,
        memberCount: 1, // Creator automatically becomes first member
        members: [
          {
            id: uuidv4(),
            groupId: null, // Will be set after group creation
            userId: user.id,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            },
            role: "trip_admin", // Dual role: parent + trip_admin
            joinedAt: new Date(),
            drivingPreferences: {
              canDrive: user.isActiveDriver,
              preferredDays: schedule.daysOfWeek || [],
              maxPassengers: 4,
              vehicleInfo: "",
            },
          },
        ],
        pendingInvitations: [],
        joinRequests: [],
        status: "active",
        isAcceptingMembers: true,
        lastActivityAt: new Date(),
        activityMetrics: {
          lastPreferenceSubmission: new Date(),
          lastScheduleGeneration: null,
          lastMemberActivity: new Date(),
          consecutiveInactiveWeeks: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set group ID on member record
      newGroup.members[0].groupId = newGroup.id;

      // Store the group
      mockCarpoolGroups.push(newGroup);

      // Update user to add trip_admin role (dual role system)
      const userIndex = mockUsers.findIndex((u) => u.id === userId);
      if (userIndex !== -1) {
        mockUsers[userIndex] = {
          ...mockUsers[userIndex],
          roles: ["parent", "trip_admin"], // Dual role assignment
          updatedAt: new Date(),
        };
      }

      context.res = {
        status: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            group: newGroup,
            message: `🎉 Congratulations! Your carpool group "${newGroup.name}" has been created successfully. You are now the Trip Admin and can start inviting other families!`,
            nextSteps: [
              "Invite other families from your school and neighborhood",
              "Set up your first weekly schedule",
              "Share your group with friends and neighbors",
              "Review group settings and safety guidelines",
            ],
          },
        }),
      };
      return;
    }

    if (method === "GET" && action === "templates") {
      // Get group creation templates
      const templates = [
        {
          id: "morning-pickup",
          name: "Morning School Pickup",
          description: "Standard morning carpool for school pickup",
          schedule: {
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            morningPickup: {
              startTime: "07:30",
              endTime: "08:00",
            },
          },
          defaultRadius: 5,
          defaultCapacity: 6,
          ageGroups: ["K", "1", "2", "3", "4", "5"],
        },
        {
          id: "afternoon-dropoff",
          name: "Afternoon School Dropoff",
          description: "Standard afternoon carpool for school dropoff",
          schedule: {
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            afternoonDropoff: {
              startTime: "15:00",
              endTime: "16:00",
            },
          },
          defaultRadius: 5,
          defaultCapacity: 6,
          ageGroups: ["K", "1", "2", "3", "4", "5"],
        },
        {
          id: "full-day",
          name: "Full Day Carpool",
          description: "Both morning pickup and afternoon dropoff",
          schedule: {
            daysOfWeek: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
            morningPickup: {
              startTime: "07:30",
              endTime: "08:00",
            },
            afternoonDropoff: {
              startTime: "15:00",
              endTime: "16:00",
            },
          },
          defaultRadius: 3,
          defaultCapacity: 4,
          ageGroups: ["K", "1", "2", "3", "4", "5"],
        },
        {
          id: "weekend-activities",
          name: "Weekend Activities",
          description: "Weekend sports, activities, and events",
          schedule: {
            daysOfWeek: ["saturday", "sunday"],
            morningPickup: {
              startTime: "09:00",
              endTime: "10:00",
            },
            afternoonDropoff: {
              startTime: "16:00",
              endTime: "17:00",
            },
          },
          defaultRadius: 10,
          defaultCapacity: 8,
          ageGroups: ["K", "1", "2", "3", "4", "5", "6", "7", "8"],
        },
      ];

      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            templates,
            message: "Group creation templates retrieved successfully",
          },
        }),
      };
      return;
    }

    if (method === "GET" && action === "check-eligibility") {
      // Check if user can create groups
      const { schoolId } = req.query;

      let eligibilityChecks = {
        canCreate: true,
        reasons: [],
        warnings: [],
        recommendations: [],
      };

      // Check if user is an active driver
      if (!user.isActiveDriver) {
        eligibilityChecks.warnings.push(
          "Consider verifying your driver status for better member trust"
        );
      }

      // Check existing groups for this school
      if (schoolId) {
        const existingGroups = mockCarpoolGroups.filter(
          (g) =>
            g.tripAdminId === userId &&
            g.targetSchoolId === schoolId &&
            g.status === "active"
        );

        if (existingGroups.length >= 3) {
          eligibilityChecks.canCreate = false;
          eligibilityChecks.reasons.push(
            "Maximum 3 active groups per school reached"
          );
        } else if (existingGroups.length >= 1) {
          eligibilityChecks.warnings.push(
            `You already manage ${existingGroups.length} group(s) for this school`
          );
        }
      }

      // Add helpful recommendations
      eligibilityChecks.recommendations = [
        "Start with a small group (4-6 children) and expand gradually",
        "Consider your daily schedule when setting pickup/dropoff times",
        "Choose a service area within 5 miles for better coordination",
        "Invite neighbors and school families you already know",
      ];

      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            eligibility: eligibilityChecks,
            message: "Eligibility check completed successfully",
          },
        }),
      };
      return;
    }

    // Invalid method or action
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: `Method ${method} with action ${action} not allowed`,
        },
      }),
    };
  } catch (error) {
    context.log.error("Parent group creation error:", error);

    context.res = {
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
