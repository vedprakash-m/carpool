import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import "reflect-metadata";
import { container } from "../../container";
import { resetPasswordSchema } from "@vcarpool/shared";
import {
  compose,
  validateBody,
  requestId,
  requestLogging,
} from "../../middleware";
import { AuthService } from "../../services/auth.service";
import { handleError } from "../../utils/error-handler";
import { ILogger } from "../../utils/logger";
import { UserService } from "../../services/user.service";

async function resetPasswordHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>("ILogger");
  const authService = container.resolve<AuthService>("AuthService");
  const userService = container.resolve<UserService>("UserService");

  try {
    const { token, newPassword } = request.validated!.body;

    // 1. Verify the reset token
    const decoded = authService.verifyPasswordResetToken(token);

    // 2. Get the user from the token
    const user = await userService.getUserById(decoded.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    // 3. Hash the new password
    const passwordHash = await authService.hashPassword(newPassword);

    // 4. Update the user's password
    await userService.updateUser(user.id, { passwordHash });

    logger.info("Password has been reset successfully", { userId: user.id });

    return {
      jsonBody: {
        success: true,
        message: "Your password has been reset successfully.",
      },
    };
  } catch (error: any) {
    // Catch specific token errors for better messages
    if (error.name === "TokenExpiredError") {
      return handleError(
        new Error("Password reset token has expired."),
        request
      );
    }
    if (error.name === "JsonWebTokenError") {
      return handleError(new Error("Invalid password reset token."), request);
    }
    return handleError(error, request);
  }
}

app.http("auth-reset-password", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/reset-password",
  handler: compose(
    requestId,
    requestLogging,
    validateBody(resetPasswordSchema)
  )(resetPasswordHandler),
});
