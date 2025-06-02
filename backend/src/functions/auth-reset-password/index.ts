import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { z } from "zod";
import { ApiResponse } from "@vcarpool/shared";
import { compose, cors, errorHandler, validateBody } from "../../middleware";
import { container } from "../../container";
import { UserService } from "../../services/user.service";
import { AuthService } from "../../services/auth.service";
import bcrypt from "bcryptjs";
import { trackExecutionTime } from "../../utils/monitoring";

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .refine(
      (val) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
          val
        ),
      "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),
});

async function resetPasswordHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const logger = container.loggers.auth;
  // Set context for the logger
  if ("setContext" in logger) {
    (logger as any).setContext(context);
  }

  const { email, token, newPassword } = request.validatedBody;

  logger.info("Password reset attempt", { email });

  try {
    // Find user by email and check if reset token is valid
    const userWithPassword = await trackExecutionTime(
      "getUserByEmail",
      () => container.userService.getUserByEmail(email),
      "UserService"
    );

    if (!userWithPassword) {
      logger.warn("Password reset attempted for non-existent user", { email });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Invalid reset token or email",
        } as ApiResponse,
      };
    }

    // Check if reset token matches and hasn't expired
    const userData = userWithPassword as any;
    if (!userData.resetToken || userData.resetToken !== token) {
      logger.warn("Invalid reset token provided", { email });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Invalid reset token or email",
        } as ApiResponse,
      };
    }

    if (
      !userData.resetTokenExpiry ||
      new Date() > new Date(userData.resetTokenExpiry)
    ) {
      logger.warn("Expired reset token used", { email });
      return {
        status: 400,
        jsonBody: {
          success: false,
          error:
            "Reset token has expired. Please request a new password reset.",
        } as ApiResponse,
      };
    }

    // Hash the new password
    const newPasswordHash = await trackExecutionTime(
      "hashPassword",
      () => container.authService.hashPasswordInstance(newPassword),
      "AuthService"
    );

    // Update user with new password and clear reset token
    await trackExecutionTime(
      "updateUserPassword",
      () =>
        container.userService.updateUser(userWithPassword.id, {
          passwordHash: newPasswordHash,
          resetToken: undefined,
          resetTokenExpiry: undefined,
        }),
      "UserService"
    );

    logger.info("Password reset successful", {
      email,
      userId: userWithPassword.id,
    });

    return {
      status: 200,
      jsonBody: {
        success: true,
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      } as ApiResponse,
    };
  } catch (error) {
    logger.error("Error processing password reset", { email, error });
    throw error; // Let the error handler middleware handle it
  }
}

app.http("auth-reset-password", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/reset-password",
  handler: compose(
    cors,
    errorHandler,
    validateBody(resetPasswordSchema)
  )(resetPasswordHandler),
});
