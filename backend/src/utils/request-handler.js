"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = handleRequest;
exports.handlePublicRequest = handlePublicRequest;
/**
 * Standard request handler for Azure Functions
 * Handles authentication and common error patterns
 */
async function handleRequest(request, context, handler) {
    try {
        // Extract user ID from headers (assuming JWT token is validated by middleware)
        const userId = request.headers.get("x-user-id");
        if (!userId) {
            return {
                status: 401,
                jsonBody: {
                    success: false,
                    error: "Authentication required",
                },
            };
        }
        // Call the actual handler
        return await handler(userId, request, context);
    }
    catch (error) {
        context.error("Request handler error:", error);
        // Handle known error types
        if (typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number") {
            return {
                status: error.statusCode,
                jsonBody: {
                    success: false,
                    error: error.message || "Error",
                },
            };
        }
        // Handle unknown errors
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: "Internal server error",
            },
        };
    }
}
/**
 * Simplified request handler without authentication for public endpoints
 */
async function handlePublicRequest(request, context, handler) {
    try {
        return await handler(request, context);
    }
    catch (error) {
        context.error("Public request handler error:", error);
        if (typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number") {
            return {
                status: error.statusCode,
                jsonBody: {
                    success: false,
                    error: error.message || "Error",
                },
            };
        }
        return {
            status: 500,
            jsonBody: {
                success: false,
                error: "Internal server error",
            },
        };
    }
}
