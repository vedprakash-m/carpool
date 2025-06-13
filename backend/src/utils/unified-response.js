/**
 * Unified CORS and Error Handling Utilities
 * Standardizes response patterns across all Azure Functions
 * Part of the technical debt resolution plan
 */

// Standard CORS headers for all functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

/**
 * Handle preflight CORS requests
 */
function handlePreflight(req) {
  if (req.method === "OPTIONS") {
    return {
      status: 200,
      headers: corsHeaders,
      body: "",
    };
  }
  return null;
}

/**
 * Create standardized success response
 */
function createSuccessResponse(data, message = "Success", status = 200) {
  return {
    status,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(errorCode, message, status = 400, details = null) {
  return {
    status,
    headers: corsHeaders,
    body: JSON.stringify({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Create paginated response
 */
function createPaginatedResponse(data, pagination, message = "Success") {
  return {
    status: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Validate authorization header
 */
function validateAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return createErrorResponse(
      "UNAUTHORIZED",
      "Missing or invalid authorization token",
      401
    );
  }
  return null; // Valid auth
}

/**
 * Extract token from authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return null;
}

/**
 * Validate required fields in request body
 */
function validateRequiredFields(body, requiredFields) {
  const missing = requiredFields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      `Missing required fields: ${missing.join(", ")}`,
      400
    );
  }
  return null; // Valid
}

/**
 * Safe JSON parsing with error handling
 */
function parseJsonBody(req) {
  try {
    if (typeof req.body === "string") {
      return JSON.parse(req.body);
    }
    return req.body;
  } catch (error) {
    return null;
  }
}

/**
 * Standardized error handler for try/catch blocks
 */
function handleError(error, context, customMessage = "Internal server error") {
  context.log.error("Function error:", error);

  // Handle specific error types
  if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
    return createErrorResponse(
      "DATABASE_CONNECTION_ERROR",
      "Unable to connect to database",
      503,
      error.message
    );
  }

  if (error.name === "ValidationError") {
    return createErrorResponse("VALIDATION_ERROR", error.message, 400);
  }

  if (error.status) {
    return createErrorResponse(
      "EXTERNAL_SERVICE_ERROR",
      error.message || customMessage,
      error.status
    );
  }

  return createErrorResponse(
    "INTERNAL_ERROR",
    customMessage,
    500,
    error.message
  );
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Get current Monday date for week-based operations
 */
function getCurrentMondayDate() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  return monday.toISOString().split("T")[0];
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Log request details for debugging
 */
function logRequest(req, context, functionName) {
  context.log(`[${functionName}] ${req.method} request received`);
  context.log(`[${functionName}] URL: ${req.url}`);
  context.log(`[${functionName}] Headers:`, req.headers);
  if (req.body) {
    context.log(`[${functionName}] Body:`, req.body);
  }
}

module.exports = {
  corsHeaders,
  handlePreflight,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  validateAuth,
  extractToken,
  validateRequiredFields,
  parseJsonBody,
  handleError,
  isValidDate,
  getCurrentMondayDate,
  formatDate,
  logRequest,
};
