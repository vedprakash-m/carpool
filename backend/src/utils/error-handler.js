"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.handleError = handleError;
const logger_1 = require("./logger");
const logger = new logger_1.AzureLogger();
/**
 * Enhanced base error class
 */
class AppError extends Error {
    message;
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = "INTERNAL_ERROR", isOperational = true, details) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
// Specific error types
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, "VALIDATION_ERROR", true, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401, "AUTHENTICATION_ERROR", true);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = "Access denied") {
        super(message, 403, "AUTHORIZATION_ERROR", true);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404, "NOT_FOUND_ERROR", true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = "Resource conflict") {
        super(message, 409, "CONFLICT_ERROR", true);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = "Rate limit exceeded", retryAfter) {
        super(message, 429, "RATE_LIMIT_ERROR", true, { retryAfter });
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, "DATABASE_ERROR", true, details);
    }
}
exports.DatabaseError = DatabaseError;
exports.Errors = {
    BadRequest: (msg, details) => new AppError(msg, 400, "BAD_REQUEST", true, details),
    Unauthorized: (msg, details) => new AppError(msg, 401, "UNAUTHORIZED", true, details),
    Forbidden: (msg, details) => new AppError(msg, 403, "FORBIDDEN", true, details),
    NotFound: (msg, details) => new AppError(msg, 404, "NOT_FOUND", true, details),
    Conflict: (msg, details) => new AppError(msg, 409, "CONFLICT", true, details),
    InternalServerError: (msg, details) => new AppError(msg, 500, "INTERNAL_ERROR", true, details),
    ValidationError: (msg, details) => new AppError(msg, 422, "VALIDATION_ERROR", true, details),
};
/**
 * Enhanced error handling function
 */
function handleError(error, requestOrLogger, loggerMaybe) {
    let logger;
    let request;
    if (isHttpRequest(requestOrLogger)) {
        request = requestOrLogger;
        logger = loggerMaybe || new logger_1.AzureLogger();
    }
    else {
        logger = requestOrLogger;
    }
    // Default error response
    const response = {
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
        response.jsonBody.error = {
            code: error.code,
            message: error.message,
        };
        if (error.details) {
            response.jsonBody.details = error.details;
        }
    }
    else if (error instanceof Error) {
        response.jsonBody.error = {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected internal error occurred.",
        };
    }
    // Add stack in development
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
        response.jsonBody.stack = error.stack;
    }
    // Log the error
    const errorObj = response.jsonBody.error;
    const logMsg = errorObj &&
        typeof errorObj === "object" &&
        errorObj !== null &&
        "message" in errorObj &&
        typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    logger.error(logMsg, {
        error,
        requestId: request?.requestId,
        statusCode: response.status,
    });
    // Always return HTTP response
    return response;
}
/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(headers) {
    if (!headers)
        return {};
    const sensitiveFields = ["authorization", "cookie", "x-api-key"];
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
            sanitized[key] = "[REDACTED]";
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
function isHttpRequest(obj) {
    return (obj !== null &&
        typeof obj === "object" &&
        "method" in obj &&
        "url" in obj &&
        typeof obj.method === "string" &&
        typeof obj.url === "string");
}
