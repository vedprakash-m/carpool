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
import bcrypt from "bcrypt";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

async function resetPasswordHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const { token, newPassword } = request.validatedBody;

  try {
    const userService = container.userService;

    // Find user by reset token
    // Note: In a real implementation, you'd need to add a method to find by reset token
    // For now, we'll need to modify the user service to support this
    const users = await userService.getUsers({});
    const user = users.users.find(
      (u: any) =>
        u.resetToken === token &&
        u.resetTokenExpiry &&
        new Date(u.resetTokenExpiry) > new Date()
    );

    if (!user) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: "Invalid or expired reset token",
        } as ApiResponse,
      };
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user with new password and clear reset token
    await userService.updateUser(user.id, {
      passwordHash,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });

    context.log(`Password reset completed for user: ${user.email}`);

    return {
      status: 200,
      jsonBody: {
        success: true,
        message: "Password has been reset successfully",
      } as ApiResponse,
    };
  } catch (error) {
    context.error("Error in password reset:", error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: "An error occurred while resetting password",
      } as ApiResponse,
    };
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
