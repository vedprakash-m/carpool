const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Parents weekly preferences function triggered");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
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

    const token = authHeader.split(" ")[1];
    // Extract parent ID from token (simplified for now)
    const parentId = "parent-1"; // Should decode from JWT

    if (req.method === "GET") {
      await getWeeklyPreferences(parentId, req, context);
    } else if (req.method === "POST") {
      await submitWeeklyPreferences(parentId, req, context);
    } else {
      context.res = UnifiedResponseHandler.methodNotAllowedError(
        "Only GET and POST methods are allowed"
      );
    }
  } catch (error) {
    context.log("Weekly preferences error:", error);

    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};

async function getWeeklyPreferences(parentId, req, context) {
  // Get week start date from query params
  const weekStartDate = req.query.weekStartDate;

  if (!weekStartDate) {
    context.res = UnifiedResponseHandler.validationError(
      "weekStartDate query parameter is required"
    );
    return;
  }

  // Mock data for now - replace with actual Cosmos DB query
  const preferences = [
    {
      id: "pref-1",
      driverParentId: parentId,
      weekStartDate,
      templateSlotId: "slot-monday-morning",
      preferenceLevel: "preferable",
      submissionTimestamp: new Date(),
    },
    {
      id: "pref-2",
      driverParentId: parentId,
      weekStartDate,
      templateSlotId: "slot-monday-afternoon",
      preferenceLevel: "less_preferable",
      submissionTimestamp: new Date(),
    },
  ];

  context.res = UnifiedResponseHandler.success({
    weekStartDate,
    preferences,
    submissionDeadline: getSubmissionDeadline(weekStartDate),
    canEdit: canEditPreferences(weekStartDate),
  });
}

async function submitWeeklyPreferences(parentId, req, context) {
  // Parse request body
  const submitRequest = req.body;

  // Validate request
  const validationError = validatePreferencesRequest(submitRequest);
  if (validationError) {
    context.res = UnifiedResponseHandler.validationError(validationError);
    return;
  }

  // Check if submission is still allowed
  if (!canEditPreferences(submitRequest.weekStartDate)) {
    context.res = UnifiedResponseHandler.validationError(
      "Preference submission deadline has passed for this week"
    );
    return;
  }

  // Create preference records
  const preferences = submitRequest.preferences.map((pref, index) => ({
    id: `pref-${parentId}-${submitRequest.weekStartDate}-${index}`,
    driverParentId: parentId,
    weekStartDate: submitRequest.weekStartDate,
    templateSlotId: pref.templateSlotId,
    preferenceLevel: pref.preferenceLevel,
    submissionTimestamp: new Date(),
  }));

  // TODO: Save to Cosmos DB
  context.log(
    `Mock saving ${preferences.length} preferences for parent ${parentId}, week ${submitRequest.weekStartDate}`
  );

  context.res = UnifiedResponseHandler.success({
    weekStartDate: submitRequest.weekStartDate,
    preferencesSubmitted: preferences.length,
    submissionTimestamp: new Date(),
    message: "Weekly preferences submitted successfully (mock)",
  });
}

function validatePreferencesRequest(request) {
  if (!request.weekStartDate) {
    return "weekStartDate is required";
  }

  if (!Array.isArray(request.preferences)) {
    return "preferences must be an array";
  }

  if (request.preferences.length === 0) {
    return "At least one preference is required";
  }

  // Count preferences by level
  const counts = {
    preferable: 0,
    less_preferable: 0,
    unavailable: 0,
  };

  for (const pref of request.preferences) {
    if (!pref.templateSlotId) {
      return "templateSlotId is required for all preferences";
    }

    if (
      !["preferable", "less_preferable", "unavailable"].includes(
        pref.preferenceLevel
      )
    ) {
      return "preferenceLevel must be preferable, less_preferable, or unavailable";
    }

    counts[pref.preferenceLevel]++;
  }

  // Validate constraints from Product Spec
  if (counts.preferable > 3) {
    return "Maximum 3 preferable slots allowed per week";
  }

  if (counts.less_preferable > 2) {
    return "Maximum 2 less-preferable slots allowed per week";
  }

  if (counts.unavailable > 2) {
    return "Maximum 2 unavailable slots allowed per week";
  }

  return null; // Valid
}

function getSubmissionDeadline(weekStartDate) {
  // Deadline is Saturday midnight of the week before the target week
  const weekStart = new Date(weekStartDate);
  const deadline = new Date(weekStart);

  // Go back to the Saturday immediately before the target week (2 days before Monday)
  // Saturday 11:59 PM is essentially Sunday 00:00 (midnight into Sunday)
  deadline.setDate(deadline.getDate() - 2); // Go back to Saturday
  deadline.setHours(23, 59, 59, 999); // Saturday at 11:59:59.999 PM (essentially midnight)

  return deadline.toISOString();
}

function canEditPreferences(weekStartDate) {
  const deadline = new Date(getSubmissionDeadline(weekStartDate));
  return new Date() < deadline;
}
