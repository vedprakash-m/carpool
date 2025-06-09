import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
  app,
} from "@azure/functions";
import { container } from "../../container";
import { TripService } from "../../services/trip.service";
import { ILogger } from "../../utils/logger";
import { ApiResponse, Trip } from "@vcarpool/shared";
import { handleError, Errors } from "../../utils/error-handler";

interface HttpRequestUser {
  userId: string;
  role: string;
  familyId?: string;
}

interface AuthenticatedHttpRequest extends Omit<HttpRequest, "user"> {
  user: HttpRequestUser | null;
}

async function tripsLeaveHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info("[trips-leave] Received request to leave trip.");

    // Get tripId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const tripId = pathParts[pathParts.length - 2]; // Assuming pattern like /trips/{id}/leave

    if (!tripId) {
      return handleError(Errors.BadRequest("Trip ID is required."), request);
    }

    // TODO: Implement authentication middleware
    // For now, we'll use a mock user
    const mockUserId = "mock-user-id"; // This should come from authentication

    const updatedTrip = await tripService.leaveTrip(tripId, mockUserId);

    if (!updatedTrip) {
      return handleError(
        Errors.NotFound("Trip not found or user was not in trip."),
        request
      );
    }

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
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });
    logger.error(`[trips-leave] Error leaving trip: ${error}`, { error });
    return handleError(error, request);
  }
}

app.http("trips-leave", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "trips/{tripId}/leave",
  handler: tripsLeaveHandler,
});
