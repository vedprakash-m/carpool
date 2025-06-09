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
import { tripIdParamSchema, joinTripParamSchema } from "@vcarpool/shared";
import { handleError, Errors } from "../../utils/error-handler";

interface HttpRequestUser {
  userId: string;
  role: string;
  familyId?: string;
}

interface AuthenticatedHttpRequest extends Omit<HttpRequest, "user"> {
  user?: HttpRequestUser | null;
  validated?: {
    params: { tripId: string };
    body: { pickupLocation: string };
  };
}

async function tripsJoinHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const tripService = container.resolve<TripService>("TripService");
    const logger = container
      .resolve<ILogger>("ILogger")
      .child({ requestId: context.invocationId });

    logger.info("[trips-join] Received request to join trip.");

    const req = request as AuthenticatedHttpRequest;

    // For now, skip authentication until middleware is properly set up
    // TODO: Add proper authentication middleware

    const tripId = request.params.tripId;
    if (!tripId) {
      return handleError(Errors.BadRequest("Trip ID is required."), request);
    }

    // Get pickup location from body
    const body = (await request.json()) as { pickupLocation?: string };
    const pickupLocation = body?.pickupLocation;

    if (!pickupLocation) {
      return handleError(
        Errors.BadRequest("Pickup location is required."),
        request
      );
    }

    // Mock user ID for now until auth is set up
    const userId = "mock-user-id";

    const updatedTrip = await tripService.joinTrip(
      tripId,
      userId,
      pickupLocation
    );

    const response: ApiResponse<Trip> = {
      success: true,
      message: "Successfully joined trip.",
      data: updatedTrip || undefined,
    };

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("trips-join", {
  methods: ["POST"],
  route: "trips/{tripId}/join",
  authLevel: "anonymous",
  handler: tripsJoinHandler,
});
