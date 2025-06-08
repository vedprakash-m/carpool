const { v4: uuidv4 } = require("uuid");

// Mock data storage (replace with actual database in production)
let mockWeeklySchedules = [
  {
    id: "schedule-1",
    groupId: "group-1",
    group: {
      id: "group-1",
      name: "Lincoln Morning Riders",
      targetSchool: { name: "Lincoln Elementary School" },
    },
    weekStartDate: "2024-01-08", // Monday
    weekEndDate: "2024-01-12", // Friday
    status: "preferences_open",
    preferencesDeadline: "2024-01-06T22:00:00Z", // Saturday 10PM
    swapsDeadline: "2024-01-07T17:00:00Z", // Sunday 5PM
    assignments: [],
    swapRequests: [],
    createdBy: "trip-admin-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockWeeklyPreferences = [
  {
    id: "pref-1",
    scheduleId: "schedule-1",
    parentId: "parent-123",
    parent: {
      id: "parent-123",
      firstName: "John",
      lastName: "Parent",
      email: "john.parent@example.com",
    },
    drivingAvailability: {
      monday: {
        canDrive: true,
        preferredRole: "driver",
        maxPassengers: 3,
        notes: "Happy to drive on Mondays",
      },
      tuesday: {
        canDrive: false,
        preferredRole: "passenger",
        notes: "Early meeting at work",
      },
      wednesday: {
        canDrive: true,
        preferredRole: "either",
        maxPassengers: 2,
      },
      thursday: {
        canDrive: true,
        preferredRole: "driver",
        maxPassengers: 3,
      },
      friday: {
        canDrive: false,
        preferredRole: "passenger",
        notes: "Family plans",
      },
    },
    specialRequests: "Please avoid pickup before 7:45 AM",
    emergencyContact: "(555) 123-4567",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isLateSubmission: false,
  },
];

let mockDrivingHistory = [
  {
    id: "history-1",
    parentId: "parent-123",
    groupId: "group-1",
    totalWeeksInGroup: 8,
    totalDrivingDays: 16,
    drivingFrequencyPercentage: 40, // 16 out of 40 days
    recentReliabilityScore: 95,
    lastDrivingDate: "2024-01-05",
    consecutiveDrivingDays: 0,
    consecutivePassengerDays: 2,
    weeklyHistory: [
      {
        weekStartDate: "2024-01-01",
        drivingDays: 2,
        passengerDays: 3,
        noShows: 0,
        lastMinuteCancellations: 0,
        swapRequestsMade: 1,
        swapRequestsAccepted: 0,
      },
    ],
    lastCalculatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Utility functions
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function getWeekEndDate(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 4); // Friday
  return d.toISOString().split("T")[0];
}

function isPreferencesDeadlinePassed(preferencesDeadline) {
  return new Date() > new Date(preferencesDeadline);
}

function isSwapsDeadlinePassed(swapsDeadline) {
  return new Date() > new Date(swapsDeadline);
}

// Enhanced scheduling algorithm with child-based load distribution and fairness rotation
function generateWeeklyAssignments(
  preferences,
  history,
  groupSettings,
  fairnessTracking = {}
) {
  const assignments = [];
  const conflicts = [];
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday"];

  // Create preference map by parent ID
  const prefMap = preferences.reduce((map, pref) => {
    map[pref.parentId] = pref;
    return map;
  }, {});

  // Create history map by parent ID
  const historyMap = history.reduce((map, hist) => {
    map[hist.parentId] = hist;
    return map;
  }, {});

  // ENHANCEMENT: Family-based load calculation with fairness rotation
  const familyUnits = groupFamiliesByChildren(preferences);
  const totalChildren = familyUnits.length;
  const totalTrips = daysOfWeek.length; // 5 days = 5 trips
  const baseTripsPerFamily = Math.floor(totalTrips / totalChildren);
  const remainderTrips = totalTrips % totalChildren;

  // FAIRNESS ENHANCEMENT: Sort families by fairness debt for remainder distribution
  const familiesWithDebt = familyUnits
    .map((family) => ({
      ...family,
      fairnessDebt: fairnessTracking[family.familyId]?.fairnessDebt || 0,
      yearlyTripCount: fairnessTracking[family.familyId]?.yearlyTripCount || 0,
    }))
    .sort((a, b) => a.fairnessDebt - b.fairnessDebt); // Most owed families first

  let totalScore = 0;
  let satisfiedPreferences = 0;
  let totalPreferences = 0;
  let familyTripAssignments = {}; // Track trips assigned per family

  // Initialize family assignments with base amount
  familiesWithDebt.forEach((family) => {
    familyTripAssignments[family.familyId] = baseTripsPerFamily;
  });

  // Distribute remainder trips to families with highest debt
  for (let i = 0; i < remainderTrips; i++) {
    const targetFamily = familiesWithDebt[i];
    familyTripAssignments[targetFamily.familyId]++;
  }

  daysOfWeek.forEach((day, index) => {
    const date = new Date("2024-01-08"); // Start with Monday
    date.setDate(date.getDate() + index);
    const dateStr = date.toISOString().split("T")[0];

    // Find available drivers for this day
    const availableDrivers = preferences.filter((pref) => {
      const dayPref = pref.drivingAvailability[day];
      return (
        dayPref &&
        dayPref.canDrive &&
        (dayPref.preferredRole === "driver" ||
          dayPref.preferredRole === "either")
      );
    });

    // Find passengers needing rides
    const needingRides = preferences.filter((pref) => {
      const dayPref = pref.drivingAvailability[day];
      return (
        dayPref &&
        (dayPref.preferredRole === "passenger" ||
          dayPref.preferredRole === "either") &&
        dayPref.preferredRole !== "unavailable"
      );
    });

    totalPreferences += preferences.length;

    if (availableDrivers.length === 0 && needingRides.length > 0) {
      conflicts.push({
        type: "insufficient_drivers",
        date: dateStr,
        timeSlot: "morning",
        description: `No available drivers for ${day}`,
        suggestedResolutions: [
          "Ask parents to volunteer",
          "Consider backup drivers",
        ],
        affectedParents: needingRides.map((p) => p.parentId),
      });
      return;
    }

    if (availableDrivers.length > 0) {
      // ENHANCEMENT: Select driver based on family load distribution and equity
      const selectedDriver = selectOptimalDriver(
        availableDrivers,
        historyMap,
        day,
        familyTripAssignments
      );

      if (selectedDriver) {
        // Track family trip assignment
        const selectedFamilyId = selectedDriver.parentId.split("-spouse")[0];
        familyTripAssignments[selectedFamilyId] =
          (familyTripAssignments[selectedFamilyId] || 0) + 1;
        const passengers = needingRides
          .filter((p) => p.parentId !== selectedDriver.parentId)
          .slice(0, selectedDriver.drivingAvailability[day].maxPassengers || 3)
          .map((p) => ({
            parentId: p.parentId,
            parent: p.parent,
            children: [{ id: "child-1", name: "Mock Child", grade: "2" }],
            pickupLocation: {
              address: "123 Home Street",
              latitude: 39.7817,
              longitude: -89.6501,
            },
            dropoffLocation: {
              address: "Lincoln Elementary School",
              latitude: 39.7817,
              longitude: -89.6501,
            },
          }));

        const assignment = {
          id: uuidv4(),
          scheduleId: "schedule-1",
          date: dateStr,
          dayOfWeek: day,
          morningTrip: {
            driverId: selectedDriver.parentId,
            driver: selectedDriver.parent,
            passengers,
            pickupTime: "07:45",
            route: generateOptimalRoute([selectedDriver, ...passengers]),
          },
          algorithmScore: calculateAssignmentScore(
            selectedDriver,
            passengers,
            day
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        assignments.push(assignment);
        totalScore += assignment.algorithmScore;
        satisfiedPreferences += 1 + passengers.length; // Driver + passengers
      }
    }
  });

  return {
    assignments,
    conflicts,
    algorithmStats: {
      totalScore: Math.round(totalScore),
      preferenceSatisfactionRate:
        totalPreferences > 0
          ? Math.round((satisfiedPreferences / totalPreferences) * 100)
          : 0,
      drivingEquityScore: calculateDrivingEquity(assignments, history),
      routeEfficiencyScore: calculateRouteEfficiency(assignments),
    },
    recommendations: generateRecommendations(conflicts, assignments),
  };
}

// ENHANCEMENT: Group families by children for load calculation
function groupFamiliesByChildren(preferences) {
  const familyMap = new Map();

  preferences.forEach((pref) => {
    // Assume parentId contains family identifier (e.g., parent-123, parent-123-spouse)
    const baseFamilyId = pref.parentId.split("-spouse")[0]; // Remove spouse suffix

    if (!familyMap.has(baseFamilyId)) {
      familyMap.set(baseFamilyId, {
        familyId: baseFamilyId,
        parents: [],
        children: 1, // Simplified: assume 1 child per family for now
        tripsAssigned: 0,
      });
    }

    familyMap.get(baseFamilyId).parents.push(pref);
  });

  return Array.from(familyMap.values());
}

// ENHANCEMENT: Select optimal driver considering family load distribution
function selectOptimalDriver(
  availableDrivers,
  historyMap,
  day,
  familyTripAssignments = {}
) {
  // Sort drivers by family equity first, then individual equity
  return availableDrivers.sort((a, b) => {
    const familyIdA = a.parentId.split("-spouse")[0];
    const familyIdB = b.parentId.split("-spouse")[0];

    // Get family trip counts
    const familyTripsA = familyTripAssignments[familyIdA] || 0;
    const familyTripsB = familyTripAssignments[familyIdB] || 0;

    // Prefer families with fewer assigned trips (child-based equity)
    if (familyTripsA !== familyTripsB) {
      return familyTripsA - familyTripsB;
    }

    // Then use individual parent equity
    const historyA = historyMap[a.parentId] || {
      consecutiveDrivingDays: 0,
      drivingFrequencyPercentage: 0,
    };
    const historyB = historyMap[b.parentId] || {
      consecutiveDrivingDays: 0,
      drivingFrequencyPercentage: 0,
    };

    // Prefer parents who haven't driven recently
    if (historyA.consecutiveDrivingDays !== historyB.consecutiveDrivingDays) {
      return historyA.consecutiveDrivingDays - historyB.consecutiveDrivingDays;
    }

    // Then prefer parents with lower overall driving frequency
    return (
      historyA.drivingFrequencyPercentage - historyB.drivingFrequencyPercentage
    );
  })[0];
}

function generateOptimalRoute(participants) {
  return participants.map((participant, index) => ({
    order: index + 1,
    location: {
      address: `${participant.parent?.firstName || "Stop"} Home`,
      latitude: 39.7817 + (Math.random() - 0.5) * 0.01,
      longitude: -89.6501 + (Math.random() - 0.5) * 0.01,
    },
    parentId: participant.parentId,
    estimatedTime: `07:${45 + index * 5}`,
    children: ["Mock Child"],
    type: "pickup",
  }));
}

function calculateAssignmentScore(driver, passengers, day) {
  let score = 50; // Base score

  // Bonus for driver preference
  if (driver.drivingAvailability[day].preferredRole === "driver") {
    score += 30;
  } else if (driver.drivingAvailability[day].preferredRole === "either") {
    score += 15;
  }

  // Bonus for utilizing driver's capacity
  const maxPassengers = driver.drivingAvailability[day].maxPassengers || 3;
  const utilizationRate = passengers.length / maxPassengers;
  score += Math.round(utilizationRate * 20);

  return Math.min(100, score);
}

function calculateDrivingEquity(assignments, history) {
  // Simplified equity calculation
  const drivingCounts = {};
  assignments.forEach((assignment) => {
    if (assignment.morningTrip) {
      const driverId = assignment.morningTrip.driverId;
      drivingCounts[driverId] = (drivingCounts[driverId] || 0) + 1;
    }
  });

  const counts = Object.values(drivingCounts);
  if (counts.length === 0) return 100;

  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const range = max - min;

  return Math.max(0, 100 - range * 20); // Lower range = higher equity
}

function calculateRouteEfficiency(assignments) {
  // Simplified efficiency score based on number of stops
  const avgStops =
    assignments.reduce((sum, assignment) => {
      return sum + (assignment.morningTrip?.route.length || 0);
    }, 0) / (assignments.length || 1);

  return Math.max(0, 100 - avgStops * 10); // Fewer stops = more efficient
}

function generateRecommendations(conflicts, assignments) {
  const recommendations = [];

  if (conflicts.length > 0) {
    recommendations.push(
      "Consider recruiting backup drivers for days with conflicts"
    );
  }

  if (assignments.length < 5) {
    recommendations.push("Some days may need manual assignment adjustment");
  }

  recommendations.push(
    "Review and adjust assignments before finalizing the schedule"
  );

  return recommendations;
}

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

    const token = authHeader.split(" ")[1];
    const method = req.method;
    const action = req.query.action;

    if (method === "GET" && action === "schedules") {
      // Get weekly schedules (Group Admin only)
      if (!token.includes("trip_admin") && !token.includes("admin")) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Group Admin access required",
          },
        });
        return;
      }

      const { groupId, status, limit = 10 } = req.query;
      let schedules = [...mockWeeklySchedules];

      if (groupId) {
        schedules = schedules.filter((s) => s.groupId === groupId);
      }

      if (status) {
        schedules = schedules.filter((s) => s.status === status);
      }

      schedules = schedules
        .sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
        .slice(0, parseInt(limit));

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          schedules,
          total: schedules.length,
          message: "Weekly schedules retrieved successfully",
        },
      });
      return;
    }

    if (method === "POST" && action === "create-schedule") {
      // Create new weekly schedule (Group Admin only)
      if (!token.includes("trip_admin") && !token.includes("admin")) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Group Admin access required",
          },
        });
        return;
      }

      const { groupId, weekStartDate } = req.body;

      if (!groupId || !weekStartDate) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Group ID and week start date are required",
          },
        });
        return;
      }

      // Check for existing schedule for this week
      const existingSchedule = mockWeeklySchedules.find(
        (s) => s.groupId === groupId && s.weekStartDate === weekStartDate
      );
      if (existingSchedule) {
        context.res.status = 409;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "SCHEDULE_EXISTS",
            message: "Schedule already exists for this week",
          },
        });
        return;
      }

      const weekStart = new Date(weekStartDate);
      const prevSaturday = new Date(weekStart);
      prevSaturday.setDate(prevSaturday.getDate() - 2); // Saturday before
      prevSaturday.setHours(22, 0, 0, 0); // 10 PM

      const nextSunday = new Date(weekStart);
      nextSunday.setDate(nextSunday.getDate() - 1); // Sunday before
      nextSunday.setHours(17, 0, 0, 0); // 5 PM

      const newSchedule = {
        id: uuidv4(),
        groupId,
        group: {
          id: groupId,
          name: "Mock Group", // In production, fetch from database
          targetSchool: { name: "Mock School" },
        },
        weekStartDate,
        weekEndDate: getWeekEndDate(weekStartDate),
        status: "preferences_open",
        preferencesDeadline: prevSaturday.toISOString(),
        swapsDeadline: nextSunday.toISOString(),
        assignments: [],
        swapRequests: [],
        createdBy: "trip-admin-1", // Extract from token
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWeeklySchedules.push(newSchedule);

      context.res.status = 201;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          schedule: newSchedule,
          message: "Weekly schedule created successfully",
        },
      });
      return;
    }

    if (method === "POST" && action === "submit-preferences") {
      // Submit weekly preferences (Parent only)
      if (!token.includes("parent") && !token.includes("trip_admin")) {
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

      const {
        scheduleId,
        drivingAvailability,
        specialRequests,
        emergencyContact,
      } = req.body;

      if (!scheduleId || !drivingAvailability) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Schedule ID and driving availability are required",
          },
        });
        return;
      }

      // Find the schedule
      const schedule = mockWeeklySchedules.find((s) => s.id === scheduleId);
      if (!schedule) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Weekly schedule not found",
          },
        });
        return;
      }

      // Check if preferences are still open
      if (schedule.status !== "preferences_open") {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "PREFERENCES_CLOSED",
            message: "Preference submission period has ended",
          },
        });
        return;
      }

      const parentId = "parent-123"; // Extract from token
      const isLateSubmission = isPreferencesDeadlinePassed(
        schedule.preferencesDeadline
      );

      // Remove existing preferences for this parent
      mockWeeklyPreferences = mockWeeklyPreferences.filter(
        (p) => !(p.scheduleId === scheduleId && p.parentId === parentId)
      );

      const newPreferences = {
        id: uuidv4(),
        scheduleId,
        parentId,
        parent: {
          id: parentId,
          firstName: "John", // Mock data
          lastName: "Parent",
          email: "john.parent@example.com",
        },
        drivingAvailability,
        specialRequests: specialRequests || "",
        emergencyContact: emergencyContact || "",
        submittedAt: new Date().toISOString(),
        isLateSubmission,
      };

      mockWeeklyPreferences.push(newPreferences);

      context.res.status = 201;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          preferences: newPreferences,
          message: isLateSubmission
            ? "Preferences submitted after deadline. Group Admin discretion applies."
            : "Weekly preferences submitted successfully",
        },
      });
      return;
    }

    if (method === "POST" && action === "generate-assignments") {
      // Generate weekly assignments using algorithm (Group Admin only)
      if (!token.includes("trip_admin") && !token.includes("admin")) {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Group Admin access required",
          },
        });
        return;
      }

      const { scheduleId, forceRegenerate = false } = req.body;

      if (!scheduleId) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Schedule ID is required",
          },
        });
        return;
      }

      const scheduleIndex = mockWeeklySchedules.findIndex(
        (s) => s.id === scheduleId
      );
      if (scheduleIndex === -1) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Weekly schedule not found",
          },
        });
        return;
      }

      const schedule = mockWeeklySchedules[scheduleIndex];

      // Check if assignments already exist
      if (schedule.assignments.length > 0 && !forceRegenerate) {
        context.res.status = 409;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "ASSIGNMENTS_EXIST",
            message:
              "Assignments already generated. Use forceRegenerate to override.",
          },
        });
        return;
      }

      // Get preferences for this schedule
      const preferences = mockWeeklyPreferences.filter(
        (p) => p.scheduleId === scheduleId
      );
      if (preferences.length === 0) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NO_PREFERENCES",
            message: "No preferences submitted for this week",
          },
        });
        return;
      }

      // Get driving history
      const groupHistory = mockDrivingHistory.filter(
        (h) => h.groupId === schedule.groupId
      );

      // Run scheduling algorithm
      const result = generateWeeklyAssignments(preferences, groupHistory, {
        maxConsecutiveDrivingDays: 3,
        preferredDrivingRotation: "equal",
        allowSingleParentDays: true,
      });

      // Update schedule
      mockWeeklySchedules[scheduleIndex] = {
        ...schedule,
        status: result.conflicts.length > 0 ? "scheduling" : "swaps_open",
        assignments: result.assignments,
        updatedAt: new Date().toISOString(),
      };

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          schedule: mockWeeklySchedules[scheduleIndex],
          algorithmOutput: result,
          message: "Weekly assignments generated successfully",
        },
      });
      return;
    }

    if (method === "GET" && action === "my-preferences") {
      // Get parent's preferences for a schedule
      const { scheduleId } = req.query;

      if (!scheduleId) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Schedule ID is required",
          },
        });
        return;
      }

      const parentId = "parent-123"; // Extract from token
      const preferences = mockWeeklyPreferences.find(
        (p) => p.scheduleId === scheduleId && p.parentId === parentId
      );

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          preferences,
          message: preferences
            ? "Preferences retrieved successfully"
            : "No preferences found",
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
    context.log.error("Weekly scheduling error:", error);

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
