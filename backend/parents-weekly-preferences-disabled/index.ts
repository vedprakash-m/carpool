import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  SubmitWeeklyPreferencesRequest,
  DriverWeeklyPreference,
} from "@vcarpool/shared";

export async function parentsWeeklyPreferences(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Parents weekly preferences function triggered");

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return { status: 200, headers: corsHeaders };
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

    const token = authHeader.split(" ")[1];
    // Extract parent ID from token (simplified for now)
    const parentId = "parent-1"; // Should decode from JWT

    if (request.method === "GET") {
      return await getWeeklyPreferences(
        parentId,
        request,
        corsHeaders,
        context
      );
    } else if (request.method === "POST") {
      return await submitWeeklyPreferences(
        parentId,
        request,
        corsHeaders,
        context
      );
    } else {
      return {
        status: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Only GET and POST methods are allowed",
          },
        }),
      };
    }
  } catch (error) {
    context.log.error("Weekly preferences error:", error);

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

async function getWeeklyPreferences(
  parentId: string,
  request: HttpRequest,
  corsHeaders: any,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Get week start date from query params
  const url = new URL(request.url);
  const weekStartDate = url.searchParams.get("weekStartDate");

  if (!weekStartDate) {
    return {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "weekStartDate query parameter is required",
        },
      }),
    };
  }

  // Mock data for now - replace with actual Cosmos DB query
  const preferences: DriverWeeklyPreference[] = [
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

  return {
    status: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: {
        weekStartDate,
        preferences,
        submissionDeadline: getSubmissionDeadline(weekStartDate),
        canEdit: canEditPreferences(weekStartDate),
      },
    }),
  };
}

async function submitWeeklyPreferences(
  parentId: string,
  request: HttpRequest,
  corsHeaders: any,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Parse request body
  const body = await request.text();
  const submitRequest: SubmitWeeklyPreferencesRequest = JSON.parse(body);

  // Validate request
  const validationError = validatePreferencesRequest(submitRequest);
  if (validationError) {
    return {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validationError,
        },
      }),
    };
  }

  // Check if submission is still allowed
  if (!canEditPreferences(submitRequest.weekStartDate)) {
    return {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "SUBMISSION_DEADLINE_PASSED",
          message: "Preference submission deadline has passed for this week",
        },
      }),
    };
  }

  // Create preference records
  const preferences: DriverWeeklyPreference[] = submitRequest.preferences.map(
    (pref, index) => ({
      id: `pref-${parentId}-${submitRequest.weekStartDate}-${index}`,
      driverParentId: parentId,
      weekStartDate: submitRequest.weekStartDate,
      templateSlotId: pref.templateSlotId,
      preferenceLevel: pref.preferenceLevel,
      submissionTimestamp: new Date(),
    })
  );

  // TODO: Save to Cosmos DB
  context.log(
    `Saving ${preferences.length} preferences for parent ${parentId}, week ${submitRequest.weekStartDate}`
  );

  return {
    status: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: {
        weekStartDate: submitRequest.weekStartDate,
        preferencesSubmitted: preferences.length,
        submissionTimestamp: new Date(),
        message: "Weekly preferences submitted successfully",
      },
    }),
  };
}

function validatePreferencesRequest(
  request: SubmitWeeklyPreferencesRequest
): string | null {
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

function getSubmissionDeadline(weekStartDate: string): string {
  // Deadline is Wednesday 5 PM of the previous week
  const weekStart = new Date(weekStartDate);
  const deadline = new Date(weekStart);
  deadline.setDate(deadline.getDate() - 5); // Go back to Wednesday
  deadline.setHours(17, 0, 0, 0); // 5 PM
  return deadline.toISOString();
}

function canEditPreferences(weekStartDate: string): boolean {
  const deadline = new Date(getSubmissionDeadline(weekStartDate));
  return new Date() < deadline;
}

app.http("parents-weekly-preferences", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "parents/weekly-preferences",
  handler: parentsWeeklyPreferences,
});
