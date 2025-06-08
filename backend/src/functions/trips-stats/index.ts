import {
  AzureFunction,
  Context,
  HttpRequest,
  HttpResponseInit,
} from "@azure/functions";
import { container } from "../../../src/container";
import { TripService } from "../../../src/services/trip.service";
import { ILogger } from "../../../src/utils/logger";
import { ApiResponse, TripStats, tripStatsQuerySchema } from "@vcarpool/shared";
import {
  authenticate,
  validateQuery,
  requestId,
  requestLogging,
  compose,
} from "../../../src/middleware";
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
    logger.info("[trips-stats] Received request for trip stats.");

    if (!req.user) {
      return handleError(
        Errors.Unauthorized("User is not authenticated."),
        req
      );
    }

    try {
      const { timeRange } = req.validated?.query;
      const stats = await tripService.getTripStats(req.user.userId, timeRange);

      const response: ApiResponse<TripStats> = {
        success: true,
        data: stats,
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      logger.error(`[trips-stats] Error getting trip stats: ${error}`, {
        error,
      });
      return handleError(error, req);
    }
  };

  const composedMiddleware = compose(
    requestId,
    requestLogging,
    authenticate,
    validateQuery(tripStatsQuerySchema)
  );

  return composedMiddleware(mainHandler.bind(null, req, context));
};

export default httpTrigger;
