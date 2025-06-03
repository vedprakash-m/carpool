import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Errors } from "./error-handler";

/**
 * Standard request handler for Azure Functions
 * Handles authentication and common error patterns
 */
export async function handleRequest(
  request: HttpRequest,
  context: InvocationContext,
  handler: (
    userId: string,
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
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
  } catch (error: any) {
    context.error("Request handler error:", error);

    // Handle known error types
    if (error.statusCode) {
      return {
        status: error.statusCode,
        jsonBody: {
          success: false,
          error: error.message,
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
export async function handlePublicRequest(
  request: HttpRequest,
  context: InvocationContext,
  handler: (
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
  try {
    return await handler(request, context);
  } catch (error: any) {
    context.error("Public request handler error:", error);

    if (error.statusCode) {
      return {
        status: error.statusCode,
        jsonBody: {
          success: false,
          error: error.message,
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
