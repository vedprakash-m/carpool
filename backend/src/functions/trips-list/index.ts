import {
  AzureFunction,
  Context,
  HttpRequest,
  HttpResponseInit,
} from "@azure/functions";
import { container } from "../../../src/container";
import { TripService } from "../../../src/services/trip.service";
import { ILogger } from "../../../src/utils/logger";
import {
  ApiResponse,
  PaginatedResponse,
  Trip,
  tripQuerySchema,
} from "@vcarpool/shared";
import {
  validateQuery,
  requestId,
  requestLogging,
  compose,
} from "../../../src/middleware";
import { handleError } from "../../../src/utils/error-handler";

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
    logger.info("[trips-list] Received request to list trips.");

    try {
      const query = req.validated?.query;
      const { trips, total } = await tripService.getTrips(query);

      const response: PaginatedResponse<Trip> = {
        success: true,
        data: trips,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (error) {
      logger.error(`[trips-list] Error listing trips: ${error}`, { error });
      return handleError(error, req);
    }
  };

  const composedMiddleware = compose(
    requestId,
    requestLogging,
    validateQuery(tripQuerySchema)
  );

  return composedMiddleware(mainHandler.bind(null, req, context));
};

export default httpTrigger;
