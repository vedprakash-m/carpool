import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { ApiResponse } from "@vcarpool/shared";
import { AzureLogger } from "./logger";
import { ILogger } from "./logger";

const logger = new AzureLogger();

/**
 * Enhanced base error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR", true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "AUTHORIZATION_ERROR", true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND_ERROR", true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, "CONFLICT_ERROR", true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_ERROR", true, { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, "DATABASE_ERROR", true, details);
  }
}

export const Errors = {
  BadRequest: (msg: string, details?: any) =>
    new AppError(msg, 400, "BAD_REQUEST", details),
  Unauthorized: (msg: string, details?: any) =>
    new AppError(msg, 401, "UNAUTHORIZED", details),
  Forbidden: (msg: string, details?: any) =>
    new AppError(msg, 403, "FORBIDDEN", details),
  NotFound: (msg: string, details?: any) =>
    new AppError(msg, 404, "NOT_FOUND", details),
  Conflict: (msg: string, details?: any) =>
    new AppError(msg, 409, "CONFLICT", details),
  InternalServerError: (msg: string, details?: any) =>
    new AppError(msg, 500, "INTERNAL_ERROR", details),
  ValidationError: (msg: string, details?: any) =>
    new AppError(msg, 422, "VALIDATION_ERROR", details),
};

/**
 * Enhanced error handling function
 */
export function handleError(
  error: unknown,
  requestOrLogger: HttpRequest | ILogger,
  loggerMaybe?: ILogger
): HttpResponseInit | void {
  let logger: ILogger;
  let request: HttpRequest | undefined;

  if (isHttpRequest(requestOrLogger)) {
    request = requestOrLogger;
    logger = loggerMaybe as ILogger;
  } else {
    logger = requestOrLogger as ILogger;
  }

  // Default error response
  const response: HttpResponseInit = {
    status: 500,
    jsonBody: {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      requestId: request?.requestId,
    },
  };

  if (error instanceof AppError) {
    response.status = error.statusCode;
    (response.jsonBody as ApiResponse<any>).error = {
      code: error.code,
      message: error.message,
    };
    if (error.details) {
      (response.jsonBody as any).details = error.details;
    }
  } else if (error instanceof Error) {
    (response.jsonBody as ApiResponse<any>).error = {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal error occurred.",
    };
  }

  // Add stack in development
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    (response.jsonBody as any).stack = error.stack;
  }

  // Log the error
  const errorObj = (response.jsonBody as ApiResponse<any>).error;
  const logMsg =
    errorObj &&
    typeof errorObj === "object" &&
    "message" in errorObj &&
    typeof errorObj.message === "string"
      ? errorObj.message
      : "Unknown error";
  logger.error(logMsg, {
    error,
    requestId: request?.requestId,
    statusCode: response.status,
  });

  // If we have a request, return an HTTP response
  if (request) {
    return response;
  }
  // Otherwise, just log (for background jobs, etc.)
}

/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(
  headers?: Record<string, string>
): Record<string, string> {
  if (!headers) return {};

  const sensitiveFields = ["authorization", "cookie", "x-api-key"];
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function isHttpRequest(obj: any): obj is HttpRequest {
  return obj && typeof obj.method === "string" && typeof obj.url === "string";
}
