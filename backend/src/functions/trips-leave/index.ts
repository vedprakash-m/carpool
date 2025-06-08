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
    logger.info("[trips-leave] Received request to leave trip.");

    if (!req.user) {
      return handleError(
        Errors.Unauthorized("User is not authenticated."),
        req
      );
    }

    try {
      const { tripId } = req.validated?.params;
      const userId = req.user.userId;

      const updatedTrip = await tripService.leaveTrip(tripId, userId);

      const response: ApiResponse<Trip> = {
        success: true,
        message: "Successfully left trip.",
        data: updatedTrip,
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      logger.error(`[trips-leave] Error leaving trip: ${error}`, { error });
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
