import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import { loginSchema } from "@vcarpool/shared";
import {
  compose,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { AuthService } from "../../services/auth.service";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";

async function loginHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const authService = container.resolve<AuthService>("AuthService");

  try {
    const { email, password } = request.validated!.body;

    const { user, accessToken, refreshToken } = await authService.login(
      email,
      password
    );

    logger.info(`User logged in successfully`, { userId: user.id });

    return {
      jsonBody: {
        success: true,
        message: "Login successful",
        data: { user, accessToken, refreshToken },
      },
    };
  } catch (error) {
    return handleError(error, request);
  }
}

app.http("auth-login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: compose(
    requestId,
    requestLogging,
    validateBody(loginSchema)
  )(loginHandler),
});
