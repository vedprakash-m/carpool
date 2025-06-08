import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import {
  compose,
  authenticate,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { TripService } from "../../services/trip.service";
import { createTripSchema } from "@vcarpool/shared";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";

async function tripsCreateHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const tripService = container.resolve<TripService>("TripService");

  try {
    const userId = request.auth?.userId;
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    const tripData = request.validated!.body;
    const createdTrip = await tripService.createTrip(userId, tripData);

    logger.info("Trip created successfully", {
      userId,
      tripId: createdTrip.id,
    });

    return {
      status: 201,
      jsonBody: {
        success: true,
        message: "Trip created successfully.",
        data: createdTrip,
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("trips-create", {
  methods: ["POST"],
  authLevel: "anonymous", // Handled by middleware
  route: "trips/create",
  handler: compose(
    requestId,
    requestLogging,
    authenticate,
    validateBody(createTripSchema)
  )(tripsCreateHandler),
});
