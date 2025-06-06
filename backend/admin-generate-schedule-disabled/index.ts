import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
// import { container } from "../../config/container.js";
// import { CosmosClient } from "../../services/cosmos-client.js";
import {
  GenerateScheduleRequest,
  RideAssignment,
  DriverWeeklyPreference,
  WeeklyScheduleTemplateSlot,
} from "@vcarpool/shared";

export async function adminGenerateSchedule(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Admin generate schedule function triggered");

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return { status: 200, headers: corsHeaders };
  }

  // Only allow POST method
  if (request.method !== "POST") {
    return {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST method is allowed",
        },
      }),
    };
  }

  try {
    // Get authorization token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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

    // Verify admin role (simplified for now - should use JWT verification)
    const token = authHeader.split(" ")[1];

    // Parse request body
    const body = await request.text();
    const generateRequest: GenerateScheduleRequest = JSON.parse(body);

    if (!generateRequest.weekStartDate) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "weekStartDate is required",
          },
        }),
      };
    }

    // Get Cosmos client (mock for now)
    // const cosmosClient = container.resolve(CosmosClient);

    // Implement the 5-step scheduling algorithm
    const schedulingResult = await generateWeeklySchedule(
      cosmosClient,
      generateRequest.weekStartDate,
      generateRequest.forceRegenerate || false,
      context
    );

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          weekStartDate: generateRequest.weekStartDate,
          assignmentsCreated: schedulingResult.assignmentsCreated,
          slotsAssigned: schedulingResult.slotsAssigned,
          unassignedSlots: schedulingResult.unassignedSlots,
          algorithmSteps: schedulingResult.algorithmSteps,
        },
      }),
    };
  } catch (error) {
    context.log.error("Generate schedule error:", error);

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
}

// Core 5-step scheduling algorithm implementation
async function generateWeeklySchedule(
  weekStartDate: string,
  forceRegenerate: boolean,
  context: InvocationContext
): Promise<{
  assignmentsCreated: number;
  slotsAssigned: number;
  unassignedSlots: string[];
  algorithmSteps: string[];
}> {
  const algorithmSteps: string[] = [];
  let assignmentsCreated = 0;
  const unassignedSlots: string[] = [];

  try {
    // Step 0: Get all template slots and weekly preferences
    algorithmSteps.push(
      "Step 0: Loading schedule templates and weekly preferences"
    );

    const templates = await getScheduleTemplates(cosmosClient);
    const preferences = await getWeeklyPreferences(cosmosClient, weekStartDate);
    const historicalAssignments = await getHistoricalAssignments(
      cosmosClient,
      weekStartDate
    );

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
      cosmosClient,
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
      cosmosClient,
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
      cosmosClient,
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
    const historicalAssignments2 = await historicalTieBreaking(
      cosmosClient,
      availableDriversPerSlot,
      assignments,
      historicalAssignments,
      weekStartDate,
      context
    );
    assignmentsCreated += historicalAssignments2.length;
    assignments.push(...historicalAssignments2);

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
    context.log.error("Scheduling algorithm error:", error);
    throw error;
  }
}

// Algorithm step implementations
function excludeUnavailableSlots(
  templates: WeeklyScheduleTemplateSlot[],
  preferences: DriverWeeklyPreference[]
): Map<string, string[]> {
  const unavailableMap = new Map<string, Set<string>>();

  // Build map of slot -> unavailable drivers
  preferences
    .filter((p) => p.preferenceLevel === "unavailable")
    .forEach((p) => {
      if (!unavailableMap.has(p.templateSlotId)) {
        unavailableMap.set(p.templateSlotId, new Set());
      }
      unavailableMap.get(p.templateSlotId)!.add(p.driverParentId);
    });

  // Get all potential drivers (parents with active driver status)
  const allDrivers = new Set(preferences.map((p) => p.driverParentId));

  // Return available drivers per slot
  const availableDriversPerSlot = new Map<string, string[]>();
  templates.forEach((template) => {
    const unavailableDrivers = unavailableMap.get(template.id) || new Set();
    const availableDrivers = Array.from(allDrivers).filter(
      (d) => !unavailableDrivers.has(d)
    );
    availableDriversPerSlot.set(template.id, availableDrivers);
  });

  return availableDriversPerSlot;
}

async function assignPreferableSlots(
  cosmosClient: CosmosClient,
  availableDriversPerSlot: Map<string, string[]>,
  preferences: DriverWeeklyPreference[],
  weekStartDate: string,
  context: InvocationContext
): Promise<RideAssignment[]> {
  const assignments: RideAssignment[] = [];
  const driverSlotCount = new Map<string, number>();

  // Get preferable preferences sorted by submission time (first come, first served)
  const preferablePrefs = preferences
    .filter((p) => p.preferenceLevel === "preferable")
    .sort(
      (a, b) =>
        new Date(a.submissionTimestamp).getTime() -
        new Date(b.submissionTimestamp).getTime()
    );

  for (const pref of preferablePrefs) {
    const currentCount = driverSlotCount.get(pref.driverParentId) || 0;

    // Max 3 preferable slots per driver
    if (currentCount >= 3) continue;

    // Check if slot is still available and driver is eligible
    const availableDrivers =
      availableDriversPerSlot.get(pref.templateSlotId) || [];
    if (!availableDrivers.includes(pref.driverParentId)) continue;

    // Check if slot is already assigned
    const existingAssignment = assignments.find(
      (a) => a.slotId === pref.templateSlotId
    );
    if (existingAssignment) continue;

    // Create assignment
    const assignment: RideAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId: pref.templateSlotId,
      driverId: pref.driverParentId,
      date: getDateFromWeekStartAndSlot(weekStartDate, pref.templateSlotId),
      passengers: [],
      assignmentMethod: "automated",
      status: "assigned",
      notes: "Assigned via preferable preference",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assignments.push(assignment);
    driverSlotCount.set(pref.driverParentId, currentCount + 1);

    // Remove driver from available list for this slot
    const updatedDrivers = availableDrivers.filter(
      (d) => d !== pref.driverParentId
    );
    availableDriversPerSlot.set(pref.templateSlotId, updatedDrivers);

    context.log(
      `Assigned preferable slot ${pref.templateSlotId} to driver ${pref.driverParentId}`
    );
  }

  return assignments;
}

async function assignLessPreferableSlots(
  cosmosClient: CosmosClient,
  availableDriversPerSlot: Map<string, string[]>,
  preferences: DriverWeeklyPreference[],
  existingAssignments: RideAssignment[],
  weekStartDate: string,
  context: InvocationContext
): Promise<RideAssignment[]> {
  const assignments: RideAssignment[] = [];
  const driverSlotCount = new Map<string, number>();

  // Count existing assignments per driver
  existingAssignments.forEach((assignment) => {
    const currentCount = driverSlotCount.get(assignment.driverId) || 0;
    driverSlotCount.set(assignment.driverId, currentCount + 1);
  });

  // Get assigned slot IDs
  const assignedSlotIds = new Set(existingAssignments.map((a) => a.slotId));

  // Get less-preferable preferences
  const lessPreferablePrefs = preferences
    .filter((p) => p.preferenceLevel === "less_preferable")
    .sort(
      (a, b) =>
        new Date(a.submissionTimestamp).getTime() -
        new Date(b.submissionTimestamp).getTime()
    );

  for (const pref of lessPreferablePrefs) {
    const currentCount = driverSlotCount.get(pref.driverParentId) || 0;

    // Check various constraints
    if (currentCount >= 5) continue; // Max 5 total slots per driver
    if (assignedSlotIds.has(pref.templateSlotId)) continue; // Slot already assigned

    const availableDrivers =
      availableDriversPerSlot.get(pref.templateSlotId) || [];
    if (!availableDrivers.includes(pref.driverParentId)) continue;

    // Count less-preferable assignments for this driver
    const driverLessPreferableCount = preferences
      .filter(
        (p) =>
          p.driverParentId === pref.driverParentId &&
          p.preferenceLevel === "less_preferable"
      )
      .filter((p) =>
        existingAssignments.some(
          (a) =>
            a.slotId === p.templateSlotId && a.driverId === p.driverParentId
        )
      ).length;

    if (driverLessPreferableCount >= 2) continue; // Max 2 less-preferable per driver

    // Create assignment
    const assignment: RideAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId: pref.templateSlotId,
      driverId: pref.driverParentId,
      date: getDateFromWeekStartAndSlot(weekStartDate, pref.templateSlotId),
      passengers: [],
      assignmentMethod: "automated",
      status: "assigned",
      notes: "Assigned via less-preferable preference",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assignments.push(assignment);
    assignedSlotIds.add(pref.templateSlotId);
    driverSlotCount.set(pref.driverParentId, currentCount + 1);

    // Remove driver from available list for this slot
    const updatedDrivers = availableDrivers.filter(
      (d) => d !== pref.driverParentId
    );
    availableDriversPerSlot.set(pref.templateSlotId, updatedDrivers);

    context.log(
      `Assigned less-preferable slot ${pref.templateSlotId} to driver ${pref.driverParentId}`
    );
  }

  return assignments;
}

async function fillNeutralSlots(
  cosmosClient: CosmosClient,
  availableDriversPerSlot: Map<string, string[]>,
  existingAssignments: RideAssignment[],
  weekStartDate: string,
  context: InvocationContext
): Promise<RideAssignment[]> {
  const assignments: RideAssignment[] = [];
  const driverSlotCount = new Map<string, number>();

  // Count existing assignments per driver
  existingAssignments.forEach((assignment) => {
    const currentCount = driverSlotCount.get(assignment.driverId) || 0;
    driverSlotCount.set(assignment.driverId, currentCount + 1);
  });

  const assignedSlotIds = new Set(existingAssignments.map((a) => a.slotId));

  // Find unassigned slots and assign to drivers with lowest assignment count
  for (const [slotId, availableDrivers] of availableDriversPerSlot.entries()) {
    if (assignedSlotIds.has(slotId)) continue; // Already assigned
    if (availableDrivers.length === 0) continue; // No available drivers

    // Sort drivers by current assignment count (fairness)
    const sortedDrivers = availableDrivers.sort((a, b) => {
      const countA = driverSlotCount.get(a) || 0;
      const countB = driverSlotCount.get(b) || 0;
      return countA - countB;
    });

    const selectedDriver = sortedDrivers[0];
    const currentCount = driverSlotCount.get(selectedDriver) || 0;

    if (currentCount >= 5) continue; // Max 5 total slots per driver

    // Create assignment
    const assignment: RideAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId: slotId,
      driverId: selectedDriver,
      date: getDateFromWeekStartAndSlot(weekStartDate, slotId),
      passengers: [],
      assignmentMethod: "automated",
      status: "assigned",
      notes: "Assigned via neutral availability",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assignments.push(assignment);
    assignedSlotIds.add(slotId);
    driverSlotCount.set(selectedDriver, currentCount + 1);

    context.log(`Assigned neutral slot ${slotId} to driver ${selectedDriver}`);
  }

  return assignments;
}

async function historicalTieBreaking(
  cosmosClient: CosmosClient,
  availableDriversPerSlot: Map<string, string[]>,
  existingAssignments: RideAssignment[],
  historicalAssignments: RideAssignment[],
  weekStartDate: string,
  context: InvocationContext
): Promise<RideAssignment[]> {
  const assignments: RideAssignment[] = [];

  // For now, implement simple historical fairness
  // Count historical assignments per driver
  const historicalCounts = new Map<string, number>();
  historicalAssignments.forEach((assignment) => {
    const count = historicalCounts.get(assignment.driverId) || 0;
    historicalCounts.set(assignment.driverId, count + 1);
  });

  const assignedSlotIds = new Set(existingAssignments.map((a) => a.slotId));

  // Assign remaining slots to drivers with least historical assignments
  for (const [slotId, availableDrivers] of availableDriversPerSlot.entries()) {
    if (assignedSlotIds.has(slotId)) continue;
    if (availableDrivers.length === 0) continue;

    // Sort by historical count (least assigned gets priority)
    const sortedDrivers = availableDrivers.sort((a, b) => {
      const countA = historicalCounts.get(a) || 0;
      const countB = historicalCounts.get(b) || 0;
      return countA - countB;
    });

    const selectedDriver = sortedDrivers[0];

    // Create assignment
    const assignment: RideAssignment = {
      id: `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId: slotId,
      driverId: selectedDriver,
      date: getDateFromWeekStartAndSlot(weekStartDate, slotId),
      passengers: [],
      assignmentMethod: "automated",
      status: "assigned",
      notes: "Assigned via historical fairness analysis",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    assignments.push(assignment);
    assignedSlotIds.add(slotId);

    context.log(
      `Assigned remaining slot ${slotId} to driver ${selectedDriver} (historical fairness)`
    );
  }

  return assignments;
}

// Helper functions
async function getScheduleTemplates(
  cosmosClient: CosmosClient
): Promise<WeeklyScheduleTemplateSlot[]> {
  // Mock data for now - replace with actual Cosmos DB query
  return [
    {
      id: "slot-monday-morning",
      dayOfWeek: 1, // Monday
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
      dayOfWeek: 1, // Monday
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

async function getWeeklyPreferences(
  cosmosClient: CosmosClient,
  weekStartDate: string
): Promise<DriverWeeklyPreference[]> {
  // Mock data for now - replace with actual Cosmos DB query
  return [
    {
      id: "pref-1",
      driverParentId: "parent-1",
      weekStartDate,
      templateSlotId: "slot-monday-morning",
      preferenceLevel: "preferable",
      submissionTimestamp: new Date(),
    },
    {
      id: "pref-2",
      driverParentId: "parent-1",
      weekStartDate,
      templateSlotId: "slot-monday-afternoon",
      preferenceLevel: "less_preferable",
      submissionTimestamp: new Date(),
    },
  ];
}

async function getHistoricalAssignments(
  cosmosClient: CosmosClient,
  weekStartDate: string
): Promise<RideAssignment[]> {
  // Mock data for now - replace with actual Cosmos DB query
  return [];
}

function getDateFromWeekStartAndSlot(
  weekStartDate: string,
  slotId: string
): string {
  // Simple implementation - extract day from slot ID and calculate date
  // This should be improved to use actual slot dayOfWeek
  const startDate = new Date(weekStartDate);
  if (slotId.includes("monday")) {
    return startDate.toISOString().split("T")[0];
  }
  // Add logic for other days
  return startDate.toISOString().split("T")[0];
}

app.http("admin-generate-schedule", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "admin/generate-schedule",
  handler: adminGenerateSchedule,
});
