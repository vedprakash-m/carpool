import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  ApiResponse,
  Trip,
  JoinTripRequest,
  tripIdParamSchema,
  joinTripParamSchema,
} from "@vcarpool/shared";
import { container } from "../../container";
import {
  compose,
  cors,
  errorHandler,
  authenticate,
  AuthenticatedRequest,
  validateBody,
} from "../../middleware";
import {
  validatePathParams,
  extractPathParam,
} from "../../middleware/validation.middleware";
import { trackExecutionTime } from "../../utils/monitoring";
import { z } from "zod";

interface ExtendedRequest extends AuthenticatedRequest {
  validatedBody?: JoinTripRequest;
  validatedParams?: { tripId: string };
}

const joinTripSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  message: z.string().optional(),
});

async function joinTripHandler(
  request: ExtendedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.trip;
  // Set context for the logger
  if ("setContext" in logger) {
    (logger as any).setContext(context);
  }

  const userId = request.user!.userId;
  logger.info("Processing join trip request", { userId });

  // Get validated path and body params
  const tripId = request.validatedParams?.tripId;
  const { pickupLocation, message } = request.validatedBody || {};

  if (!pickupLocation || pickupLocation.trim().length === 0) {
    logger.warn("Missing pickup location in request");
    return {
      status: 400,
      jsonBody: {
        success: false,
        error: "Pickup location is required",
      } as ApiResponse,
    };
  }

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

    // Check if trip is still available
    if (new Date(trip.date) <= new Date()) {
      logger.warn("User attempted to join a past trip", { tripId });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Cannot join a past trip",
        } as ApiResponse,
      };
    }

    // Check if user is trying to join their own trip
    if (trip.driverId === userId) {
      logger.warn("User attempted to join their own trip", { tripId, userId });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Cannot join your own trip",
        } as ApiResponse,
      };
    }

    // Check if user already joined
    if (trip.passengers.some((p: any) => p.userId === userId)) {
      logger.warn("User attempted to join a trip they have already joined", {
        tripId,
        userId,
      });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "You have already joined this trip",
        } as ApiResponse,
      };
    }

    // Check if trip is full
    if (trip.passengers.length >= trip.maxPassengers) {
      logger.warn("Trip is full", { tripId });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Trip is full",
        } as ApiResponse,
      };
    }

    // Get user details
    const user = await container.userService.getUserById(userId);
    if (!user) {
      logger.warn("User not found", { userId });
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: "User not found",
        } as ApiResponse,
      };
    }

    // Add user to trip
    const passenger = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      joinedAt: new Date(),
      message: message || "",
    };

    const updatedTrip = await trackExecutionTime(
      "addPassenger",
      () =>
        container.tripService.addPassenger(
          tripId || "",
          userId,
          pickupLocation
        ),
      "TripService"
    );

    // Get driver details for email notification
    const driver = await container.userService.getUserById(trip.driverId);
    if (driver) {
      // Send email notification to driver
      await container.emailService.sendTripJoinedNotification(
        driver.email,
        driver.firstName,
        `${user.firstName} ${user.lastName}`,
        {
          date: trip.date,
          departureTime: trip.departureTime,
          destination: trip.destination,
        }
      );

      // Send confirmation email to passenger
      await container.emailService.sendJoinConfirmationNotification(
        user.email,
        user.firstName,
        `${driver.firstName} ${driver.lastName}`,
        {
          date: trip.date,
          departureTime: trip.departureTime,
          destination: trip.destination,
        }
      );
    }

    logger.info("User successfully joined trip", { tripId, userId });
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: updatedTrip,
        message: "Successfully joined the trip",
      } as ApiResponse<Trip>,
    };
  } catch (error: any) {
    logger.error("Error joining trip", {
      error: error.message,
      tripId,
      userId,
    });
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: "An error occurred while joining the trip",
      } as ApiResponse,
    };
  }
}

app.http("trips-join", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "trips/join",
  handler: compose(
    cors,
    errorHandler,
    authenticate,
    validateBody(joinTripSchema)
  )(joinTripHandler),
});
