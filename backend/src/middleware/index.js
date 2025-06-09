"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.requestLogging = exports.requestId = void 0;
exports.compose = compose;
exports.hasRole = hasRole;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
require("reflect-metadata");
const container_1 = require("../container");
const uuid_1 = require("uuid");
const error_handler_1 = require("../utils/error-handler");
/**
 * Composes multiple middlewares into a single handler.
 * The middlewares are executed in the order they are provided.
 */
function compose(...middlewares) {
    return (finalHandler) => async (request, context) => {
        for (const middleware of middlewares) {
            const response = await middleware(request, context);
            if (response) {
                // If a middleware returns a response, stop processing and return it
                return response;
            }
        }
        // If all middlewares pass, call the final handler
        const finalResponse = await finalHandler(request, context);
        // The final handler must return a response. If it doesn't, something is wrong.
        if (!finalResponse) {
            return (0, error_handler_1.handleError)(new Error("The final handler did not return a response."), request);
        }
        return finalResponse;
    };
}
// Middleware to add a request ID to each request
const requestId = async (request, context) => {
    request.requestId = request.headers.get("x-request-id") || (0, uuid_1.v4)();
};
exports.requestId = requestId;
// Middleware for basic request logging
const requestLogging = async (request, context) => {
    const logger = container_1.container.resolve("ILogger");
    logger.info(`Request received: ${request.method} ${request.url}`, {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
    });
};
exports.requestLogging = requestLogging;
// Middleware for authentication
const authenticate = async (request, context) => {
    const authService = container_1.container.resolve("AuthService");
    const logger = container_1.container
        .resolve("ILogger")
        .child({ requestId: request.requestId });
    try {
        const authHeader = request.headers.get("authorization");
        const token = authService.extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            throw error_handler_1.Errors.Unauthorized("Authorization token is required.");
        }
        const payload = authService.verifyAccessToken(token);
        request.auth = payload;
        logger.debug("Authentication successful", { userId: payload.userId });
    }
    catch (error) {
        logger.warn("Authentication failed", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return (0, error_handler_1.handleError)(error, request);
    }
};
exports.authenticate = authenticate;
// Middleware to check for a specific role
function hasRole(requiredRole) {
    return async (request, context) => {
        if (!request.auth || request.auth.role !== requiredRole) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.Forbidden("Insufficient permissions."), request);
        }
    };
}
// Middleware to validate the request body using a Zod schema
function validateBody(schema) {
    return async (request, context) => {
        try {
            const body = await request.json();
            const result = schema.safeParse(body);
            if (!result.success) {
                return (0, error_handler_1.handleError)(error_handler_1.Errors.ValidationError("Invalid request body.", result.error.flatten()), request);
            }
            request.validated = { ...request.validated, body: result.data };
        }
        catch (error) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.BadRequest("Invalid JSON in request body."), request);
        }
    };
}
// Middleware to validate the query parameters using a Zod schema
function validateQuery(schema) {
    return async (request, context) => {
        const queryParams = {};
        request.query.forEach((value, key) => {
            queryParams[key] = value;
        });
        const result = schema.safeParse(queryParams);
        if (!result.success) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.ValidationError("Invalid query parameters.", result.error.flatten()), request);
        }
        request.validated = { ...request.validated, query: result.data };
    };
}
// Middleware to validate the path parameters using a Zod schema
function validateParams(schema) {
    return async (request, context) => {
        const result = schema.safeParse(request.params);
        if (!result.success) {
            return (0, error_handler_1.handleError)(error_handler_1.Errors.ValidationError("Invalid path parameters.", result.error.flatten()), request);
        }
        request.validated = { ...request.validated, params: result.data };
    };
}
