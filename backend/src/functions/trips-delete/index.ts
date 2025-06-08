import {
  AzureFunction,
  Context,
  HttpRequest,
  HttpResponseInit,
} from "@azure/functions";
import { container } from "../../../src/container";
import { TripService } from "../../../src/services/trip.service";
import { ILogger } from "../../../src/utils/logger";
import { ApiResponse, Trip } from "@vcarpool/shared";
import {
  authenticate,
  validateParams,
  requestId,
  requestLogging,
  compose,
  hasRole,
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
    logger.info("[trips-delete] Received request to delete trip.");

    if (!req.user) {
      return handleError(
        Errors.Unauthorized("User is not authenticated."),
        req
      );
    }

    try {
      const { tripId } = req.validated?.params;
      const trip = await tripService.getTripById(tripId);

      if (!trip) {
        return handleError(Errors.NotFound("Trip not found."), req);
      }

      // User must be the trip driver or an admin to delete the trip
      if (trip.driverId !== req.user.userId && req.user.role !== "admin") {
        return handleError(
          Errors.Forbidden("You are not authorized to delete this trip."),
          req
        );
      }

      await tripService.deleteTrip(tripId);

      const response: ApiResponse<void> = {
        success: true,
        message: "Trip deleted successfully.",
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      logger.error(`[trips-delete] Error deleting trip: ${error}`, { error });
      return handleError(error, req);
    }
  };

  const composedMiddleware = compose(
    requestId,
    requestLogging,
    authenticate,
    validateParams(tripIdParamSchema)
  );

  return composedMiddleware(mainHandler.bind(null, req, context));
};

export default httpTrigger;
