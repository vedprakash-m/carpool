import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import { compose, requestId, requestLogging } from "../../middleware";
import { AuthService } from "../../services/auth.service";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";

async function refreshTokenHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const authService = container.resolve<AuthService>("AuthService");

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body || typeof body.refreshToken !== "string") {
      throw new Error("Refresh token is required.");
    }

    const { refreshToken } = body;
    const result = await authService.refreshAccessToken(refreshToken);

    return {
      jsonBody: {
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: result.accessToken,
          refreshToken: refreshToken, // Return the original refresh token
          user: result.user,
        },
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("auth-refresh-token", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/refresh-token",
  handler: compose(requestId, requestLogging)(refreshTokenHandler),
});
