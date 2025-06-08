import {
  AzureFunction,
  Context,
  HttpRequest,
  HttpResponseInit,
} from "@azure/functions";
import { container } from "../../../src/container";
import { TripService } from "../../../src/services/trip.service";
import { ILogger } from "../../../src/utils/logger";
import { ApiResponse, Trip, updateTripSchema } from "@vcarpool/shared";
import {
  authenticate,
  validateBody,
  validateParams,
  requestId,
  requestLogging,
  compose,
} from "../../../src/middleware";
import { tripIdParamSchema } from "@vcarpool/shared/schemas/trip-params";
import { handleError, Errors } from "../../../src/utils/error-handler";

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<HttpResponseInit> {
  const tripService = container.resolve<TripService>("TripService");
  const logger = container
    .resolve<ILogger>("ILogger")
    .child({ requestId: req.requestId });

  const mainHandler = async (
    req: HttpRequest,
    context: Context
  ): Promise<HttpResponseInit> => {
    logger.info("[trips-update] Received request to update trip.");

    if (!req.user) {
      return handleError(
        Errors.Unauthorized("User is not authenticated."),
        req
      );
    }

    try {
      const { tripId } = req.validated?.params;
      const updateData = req.validated?.body;

      const trip = await tripService.getTripById(tripId);

      if (!trip) {
        return handleError(Errors.NotFound("Trip not found."), req);
      }

      // User must be the trip driver or an admin to update the trip
      if (trip.driverId !== req.user.userId && req.user.role !== "admin") {
        return handleError(
          Errors.Forbidden("You are not authorized to update this trip."),
          req
        );
      }

      const updatedTrip = await tripService.updateTrip(tripId, updateData);

      const response: ApiResponse<Trip> = {
        success: true,
        message: "Trip updated successfully.",
        data: updatedTrip,
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      logger.error(`[trips-update] Error updating trip: ${error}`, { error });
      return handleError(error, req);
    }
  };

  const composedMiddleware = compose(
    requestId,
    requestLogging,
    authenticate,
    validateParams(tripIdParamSchema),
    validateBody(updateTripSchema)
  );

  return composedMiddleware(mainHandler.bind(null, req, context));
};

export default httpTrigger;
