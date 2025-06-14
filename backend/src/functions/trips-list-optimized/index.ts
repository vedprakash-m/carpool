/**
 * Example of trips-list function using Phase 2 optimization middleware
 * This demonstrates how to easily add Phase 2 optimizations to any existing function
 */

import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import { PaginatedResponse, Trip, TripStatus } from "@vcarpool/shared";
import { handleError } from "../../utils/error-handler";
import { withPhase2Optimizations } from "../../middleware/phase2-optimization.middleware";

/**
 * Original trips list handler (unchanged business logic)
 */
async function tripsListHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info("[trips-list-optimized] Processing trip list request");

    // Parse query parameters
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");

    const query = {
      page: parseInt(url.searchParams.get("page") || "1"),
      limit: parseInt(url.searchParams.get("limit") || "10"),
      status:
        statusParam &&
        ["planned", "active", "completed", "cancelled"].includes(statusParam)
          ? (statusParam as TripStatus)
          : undefined,
      driverId: url.searchParams.get("driverId") || undefined,
      date: url.searchParams.get("date") || undefined,
    };

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
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });
    logger.error(`[trips-list-optimized] Error listing trips: ${error}`, {
      error,
    });
    return handleError(error, request);
  }
}

// Wrap the handler with Phase 2 optimizations
const optimizedTripsListHandler = withPhase2Optimizations(tripsListHandler, {
  enableCaching: true,
  enableCompression: true,
  enableDeduplication: true,
  enablePagination: true,
  cacheConfig: {
    ttl: 300000, // 5 minutes
    levels: ["l1", "l2"],
  },
  compressionThreshold: 512, // Compress responses > 512 bytes
  excludeRoutes: [], // No exclusions for this function
});

app.http("trips-list-optimized", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "trips/optimized",
  handler: optimizedTripsListHandler,
});

export default optimizedTripsListHandler;
