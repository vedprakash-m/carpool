const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Admin generate schedule function triggered");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  // Only allow POST method
  if (req.method !== "POST") {
    context.res = UnifiedResponseHandler.methodNotAllowed(
      "Only POST method is allowed"
    );
    return;
  }

  try {
    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError(
        "Missing or invalid authorization token"
      );
      return;
    }

    // Parse request body
    const generateRequest = req.body;

    if (!generateRequest.weekStartDate) {
      context.res = UnifiedResponseHandler.validationError(
        "weekStartDate is required"
      );
      return;
    }

    // Implement the 5-step scheduling algorithm (simplified mock)
    const schedulingResult = await generateWeeklySchedule(
      generateRequest.weekStartDate,
      generateRequest.forceRegenerate || false,
      context
    );

    context.res = UnifiedResponseHandler.success({
      weekStartDate: generateRequest.weekStartDate,
      assignmentsCreated: schedulingResult.assignmentsCreated,
      slotsAssigned: schedulingResult.slotsAssigned,
      unassignedSlots: schedulingResult.unassignedSlots,
      algorithmSteps: schedulingResult.algorithmSteps,
    });
  } catch (error) {
    context.log("Generate schedule error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};

// Core 5-step scheduling algorithm implementation (simplified mock)
async function generateWeeklySchedule(weekStartDate, forceRegenerate, context) {
  const algorithmSteps = [];
  let assignmentsCreated = 0;
  const unassignedSlots = [];

  try {
    // Step 0: Get all template slots and weekly preferences
    algorithmSteps.push(
      "Step 0: Loading schedule templates and weekly preferences"
    );

    const templates = await getScheduleTemplates();
    const preferences = await getWeeklyPreferences(weekStartDate);

    context.log(
      `Found ${templates.length} template slots and ${preferences.length} preferences`
    );

    // Step 1: Exclude unavailable slots
    algorithmSteps.push("Step 1: Excluding drivers marked as unavailable");
    const availableDriversPerSlot = excludeUnavailableSlots(
      templates,
      preferences
    );

    // Step 2: Assign preferable slots first
    algorithmSteps.push(
      "Step 2: Assigning drivers to their preferable slots (max 3 per driver)"
    );
    const assignments = await assignPreferableSlots(
      availableDriversPerSlot,
      preferences,
      weekStartDate,
      context
    );
    assignmentsCreated += assignments.length;

    // Step 3: Assign less-preferable slots
    algorithmSteps.push(
      "Step 3: Assigning drivers to less-preferable slots (max 2 per driver)"
    );
    const lessPreferableAssignments = await assignLessPreferableSlots(
      availableDriversPerSlot,
      preferences,
      assignments,
      weekStartDate,
      context
    );
    assignmentsCreated += lessPreferableAssignments.length;
    assignments.push(...lessPreferableAssignments);

    // Step 4: Fill remaining slots with neutral drivers
    algorithmSteps.push(
      "Step 4: Filling remaining slots with available neutral drivers"
    );
    const neutralAssignments = await fillNeutralSlots(
      availableDriversPerSlot,
      assignments,
      weekStartDate,
      context
    );
    assignmentsCreated += neutralAssignments.length;
    assignments.push(...neutralAssignments);

    // Step 5: Historical tie-breaking for remaining slots
    algorithmSteps.push(
      "Step 5: Using historical analysis for fair distribution of remaining slots"
    );
    const historicalAssignments = await historicalTieBreaking(
      availableDriversPerSlot,
      assignments,
      weekStartDate,
      context
    );
    assignmentsCreated += historicalAssignments.length;
    assignments.push(...historicalAssignments);

    // Identify unassigned slots
    const assignedSlotIds = new Set(assignments.map((a) => a.slotId));
    unassignedSlots.push(
      ...templates.filter((t) => !assignedSlotIds.has(t.id)).map((t) => t.id)
    );

    algorithmSteps.push(
      `Algorithm completed: ${assignmentsCreated} assignments created, ${unassignedSlots.length} slots remain unassigned`
    );

    return {
      assignmentsCreated,
      slotsAssigned: assignments.length,
      unassignedSlots,
      algorithmSteps,
    };
  } catch (error) {
    context.log("Scheduling algorithm error:", error);
    throw error;
  }
}

// Algorithm step implementations (simplified mocks)
function excludeUnavailableSlots(templates, preferences) {
  // Mock implementation
  const availableDriversPerSlot = new Map();
  templates.forEach((template) => {
    availableDriversPerSlot.set(template.id, [
      "parent-1",
      "parent-2",
      "parent-3",
    ]);
  });
  return availableDriversPerSlot;
}

async function assignPreferableSlots(
  availableDriversPerSlot,
  preferences,
  weekStartDate,
  context
) {
  // Mock implementation - assign first preference
  const assignments = [
    {
      id: `assignment-${Date.now()}`,
      slotId: "slot-monday-morning",
      driverId: "parent-1",
      date: new Date(weekStartDate).toISOString().split("T")[0],
      passengers: [],
      assignmentMethod: "automated",
      status: "assigned",
      notes: "Assigned via preferable preference (mock)",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  context.log(`Mock assigned ${assignments.length} preferable slots`);
  return assignments;
}

async function assignLessPreferableSlots(
  availableDriversPerSlot,
  preferences,
  existingAssignments,
  weekStartDate,
  context
) {
  // Mock implementation
  const assignments = [];
  context.log(`Mock assigned ${assignments.length} less-preferable slots`);
  return assignments;
}

async function fillNeutralSlots(
  availableDriversPerSlot,
  existingAssignments,
  weekStartDate,
  context
) {
  // Mock implementation
  const assignments = [];
  context.log(`Mock assigned ${assignments.length} neutral slots`);
  return assignments;
}

async function historicalTieBreaking(
  availableDriversPerSlot,
  existingAssignments,
  weekStartDate,
  context
) {
  // Mock implementation
  const assignments = [];
  context.log(`Mock assigned ${assignments.length} historical slots`);
  return assignments;
}

// Helper functions (simplified mocks)
async function getScheduleTemplates() {
  return [
    {
      id: "slot-monday-morning",
      dayOfWeek: 1,
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Monday Morning School Drop-off",
      maxPassengers: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "slot-monday-afternoon",
      dayOfWeek: 1,
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Monday Afternoon School Pick-up",
      maxPassengers: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

async function getWeeklyPreferences(weekStartDate) {
  return [
    {
      id: "pref-1",
      driverParentId: "parent-1",
      weekStartDate,
      templateSlotId: "slot-monday-morning",
      preferenceLevel: "preferable",
      submissionTimestamp: new Date(),
    },
  ];
}

app.http("admin-generate-schedule-simple", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/generate-schedule",
  handler: adminGenerateSchedule,
});

module.exports = { adminGenerateSchedule };
