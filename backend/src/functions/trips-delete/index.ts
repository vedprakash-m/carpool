import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { ApiResponse, Trip, tripIdParamSchema } from "@vcarpool/shared";
import { container } from "../../container";
import {
  compose,
  cors,
  errorHandler,
  authenticate,
  AuthenticatedRequest,
} from "../../middleware";
import {
  validatePathParams,
  extractPathParam,
} from "../../middleware/validation.middleware";
import { trackExecutionTime } from "../../utils/monitoring";

interface ExtendedRequest extends AuthenticatedRequest {
  validatedParams?: { tripId: string };
}

async function deleteTripHandler(
  request: ExtendedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ("setContext" in logger) {
    (logger as any).setContext(context);
  }

  const userId = request.user!.userId;
  const tripId = request.validatedParams?.tripId;

  logger.info("Processing delete trip request", { userId, tripId });

  try {
    // Check if trip exists with performance tracking
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

    // Check if user is the driver
    if (trip.driverId !== userId) {
      logger.warn("Non-driver attempted to delete trip", {
        tripId,
        userId,
        driverId: trip.driverId,
      });
      return {
        status: 403,
        jsonBody: {
          success: false,
          error: "Only the trip driver can delete the trip",
        } as ApiResponse,
      };
    }

    // Check trip status - can only delete planned trips
    if (trip.status !== "planned") {
      logger.warn("Attempted to delete non-planned trip", {
        tripId,
        status: trip.status,
      });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Can only delete planned trips",
        } as ApiResponse,
      };
    }

    // Check if trip has passengers - warn but allow deletion
    if (trip.passengers.length > 0) {
      logger.info("Deleting trip with passengers - they will be notified", {
        tripId,
        passengerCount: trip.passengers.length,
      });
    }

    // Cancel the trip (set status to cancelled) instead of hard delete
    const cancelledTrip = await trackExecutionTime(
      "cancelTrip",
      () => container.tripService.cancelTrip(tripId || ""),
      "TripService"
    );

    // TODO: Send notifications to passengers about trip cancellation
    // This could be implemented with email service or push notifications

    logger.info("Trip successfully cancelled", { tripId, userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: cancelledTrip,
        message: "Trip cancelled successfully. Passengers have been notified.",
      } as ApiResponse<Trip>,
    };
  } catch (error: any) {
    logger.error("Error deleting trip", {
      error: error.message,
      tripId,
      userId,
    });
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: "An error occurred while deleting the trip",
      } as ApiResponse,
    };
  }
}

app.http("trips-delete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "trips/{tripId}",
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validatePathParams(tripIdParamSchema, extractPathParam("tripId"))
  )(deleteTripHandler),
});
