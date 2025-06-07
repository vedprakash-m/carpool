const { CosmosClient } = require("@azure/cosmos");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

module.exports = async function (context, reminderTimer, req) {
  context.log("Assignment Reminders function triggered");

  // Handle timer-based execution
  if (reminderTimer) {
    context.log("Running scheduled assignment reminders check");
    await processScheduledReminders(context);
    return;
  }

  // Handle HTTP-based execution
  if (req) {
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
      context.res = await processManualReminders(req, context);
    } catch (error) {
      context.log.error("Assignment reminders error:", error);
      context.res = {
        status: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
            details: error.message,
          },
        }),
      };
    }
  }
};

// Process scheduled reminders (timer-triggered)
async function processScheduledReminders(context) {
  try {
    const now = new Date();

    // Calculate reminder times
    const reminder24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminder2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Get assignments that need reminders
    const assignments = await getUpcomingAssignments(
      reminder24h,
      reminder2h,
      context
    );

    let remindersSent = 0;

    for (const assignment of assignments) {
      const assignmentTime = new Date(
        `${assignment.date}T${assignment.startTime}:00`
      );
      const timeUntilAssignment = assignmentTime.getTime() - now.getTime();
      const hoursUntil = timeUntilAssignment / (1000 * 60 * 60);

      // Send 24h reminder
      if (hoursUntil <= 24 && hoursUntil > 23 && !assignment.reminder24hSent) {
        await sendAssignmentReminder(
          "assignment_reminder_24h",
          assignment,
          context
        );
        await markReminderSent(assignment.id, "24h", context);
        remindersSent++;
      }

      // Send 2h reminder
      if (hoursUntil <= 2 && hoursUntil > 1 && !assignment.reminder2hSent) {
        await sendAssignmentReminder(
          "assignment_reminder_2h",
          assignment,
          context
        );
        await markReminderSent(assignment.id, "2h", context);
        remindersSent++;
      }
    }

    context.log(
      `Processed ${assignments.length} assignments, sent ${remindersSent} reminders`
    );
  } catch (error) {
    context.log.error("Scheduled reminders error:", error);
  }
}

// Process manual reminders (HTTP-triggered)
async function processManualReminders(req, context) {
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { assignmentId, reminderType } = body;

  if (!assignmentId || !reminderType) {
    return {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "assignmentId and reminderType are required",
        },
      }),
    };
  }

  // Get specific assignment
  const assignment = await getAssignmentById(assignmentId, context);

  if (!assignment) {
    return {
      status: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "ASSIGNMENT_NOT_FOUND",
          message: "Assignment not found",
        },
      }),
    };
  }

  // Send reminder
  const result = await sendAssignmentReminder(
    reminderType,
    assignment,
    context
  );

  return {
    status: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: result,
      message: "Reminder sent successfully",
    }),
  };
}

// Get upcoming assignments that need reminders
async function getUpcomingAssignments(reminder24h, reminder2h, context) {
  // In production, this would query Cosmos DB
  // For development, return mock assignments
  return getMockUpcomingAssignments();
}

// Get assignment by ID
async function getAssignmentById(assignmentId, context) {
  // In production, this would query Cosmos DB
  // For development, return mock assignment
  const assignments = getMockUpcomingAssignments();
  return assignments.find((a) => a.id === assignmentId);
}

// Send assignment reminder
async function sendAssignmentReminder(reminderType, assignment, context) {
  try {
    const notificationData = buildReminderNotificationData(
      reminderType,
      assignment
    );

    // In production, this would call the notification service
    context.log(
      `Reminder simulated: ${reminderType} for assignment ${assignment.id}`
    );

    return {
      success: true,
      notificationId: `reminder-${Date.now()}`,
      type: reminderType,
      assignmentId: assignment.id,
      recipient: assignment.driverEmail,
      status: "sent",
    };
  } catch (error) {
    context.log.error("Failed to send assignment reminder:", error);
    return { success: false, error: error.message };
  }
}

// Mark reminder as sent
async function markReminderSent(assignmentId, reminderType, context) {
  // In production, this would update the assignment record in Cosmos DB
  context.log(
    `Marked ${reminderType} reminder as sent for assignment ${assignmentId}`
  );
}

// Build notification data for reminders
function buildReminderNotificationData(reminderType, assignment) {
  const passengerList = assignment.passengers
    .map(
      (p, index) =>
        `${index + 1}. ${p.name}${p.phoneNumber ? ` (${p.phoneNumber})` : ""}`
    )
    .join("\n");

  return {
    driverName: assignment.driverName,
    assignmentDate: formatDate(assignment.date),
    assignmentTime: `${assignment.startTime} - ${assignment.endTime}`,
    assignmentDescription: assignment.description,
    passengerCount: assignment.passengers.length,
    passengerList,
    pickupLocation: assignment.pickupLocation,
    dropoffLocation: assignment.dropoffLocation,
  };
}

// Mock data for development
function getMockUpcomingAssignments() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return [
    {
      id: "assignment-upcoming-1",
      date: tomorrow.toISOString().split("T")[0],
      startTime: "07:30",
      endTime: "08:30",
      description: "Monday Morning School Drop-off",
      driverId: "parent-1",
      driverName: "Sarah Johnson",
      driverEmail: "sarah.johnson@email.com",
      passengers: [
        { id: "child-1", name: "Emma Wilson", phoneNumber: "555-0126" },
        { id: "child-2", name: "Lucas Chen", phoneNumber: "555-0124" },
      ],
      pickupLocation: "123 Maple Street",
      dropoffLocation: "Lincoln Elementary School",
      reminder24hSent: false,
      reminder2hSent: false,
    },
    {
      id: "assignment-upcoming-2",
      date: dayAfter.toISOString().split("T")[0],
      startTime: "15:00",
      endTime: "16:00",
      description: "Tuesday Afternoon School Pick-up",
      driverId: "parent-2",
      driverName: "Michael Chen",
      driverEmail: "michael.chen@email.com",
      passengers: [
        { id: "child-3", name: "Sophie Davis", phoneNumber: "555-0125" },
      ],
      pickupLocation: "Lincoln Elementary School",
      dropoffLocation: "456 Oak Avenue",
      reminder24hSent: false,
      reminder2hSent: false,
    },
  ];
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
