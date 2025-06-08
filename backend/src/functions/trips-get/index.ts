import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { ApiResponse, Trip, tripIdParamSchema } from "@vcarpool/shared";
import { container } from "../../container";
import { compose, authenticate } from "../../middleware";
import {
  validatePathParams,
  extractPathParam,
} from "../../middleware/validation.middleware";
import { trackExecutionTime } from "../../utils/monitoring";

async function getTripHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ("setContext" in logger) {
    (logger as any).setContext(context);
  }

  const userId = request.auth?.userId;
  const tripId = request.validatedParams?.tripId;

  logger.info("Processing get trip request", { userId, tripId });

  try {
    // Get trip with performance tracking
    const trip = await trackExecutionTime(
      "getTripById",
      () => container.tripService.getTripById(tripId || ""),
      "TripService"
    );

    if (!trip) {
      logger.warn("Trip not found", { tripId });
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: "Trip not found",
        } as ApiResponse,
      };
    }

    // Note: No access control here - users can view any trip
    // This allows passengers to see trip details and potential passengers to view available trips

    logger.info("Trip retrieved successfully", { tripId, userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: trip,
        message: "Trip retrieved successfully",
      } as ApiResponse<Trip>,
    };
  } catch (error: any) {
    logger.error("Error getting trip", {
      error: error.message,
      tripId,
      userId,
    });
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: "An error occurred while retrieving the trip",
      } as ApiResponse,
    };
  }
}

app.http("trips-get", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "trips/{tripId}",
  handler: compose(
    authenticate,
    validatePathParams(tripIdParamSchema, extractPathParam("tripId"))
  )(getTripHandler),
});
