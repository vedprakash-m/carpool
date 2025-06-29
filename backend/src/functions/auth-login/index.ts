import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import { loginSchema } from "@carpool/shared";
import {
  compose,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { LoginUseCase } from "../../core/auth/usecases/LoginUseCase";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";

async function loginHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const loginUseCase = container.resolve<LoginUseCase>("LoginUseCase");

  try {
    const { email, password } = request.validated!.body;

    const { user, accessToken, refreshToken } = await loginUseCase.execute(
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
