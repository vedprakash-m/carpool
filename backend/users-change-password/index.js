const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Users change password function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Only allow PUT method
    if (req.method !== "PUT") {
      context.res = UnifiedResponseHandler.error(
        "METHOD_NOT_ALLOWED",
        "Only PUT method is allowed",
        405
      );
      return;
    }

    // Parse request body
    const body = await UnifiedResponseHandler.parseJsonBody(req);
    const { currentPassword, newPassword } = body || {};

    // Validate required fields
    const validation = UnifiedResponseHandler.validateRequiredFields(
      { currentPassword, newPassword },
      ["currentPassword", "newPassword"]
    );

    if (!validation.isValid) {
      context.res = UnifiedResponseHandler.validationError(
        "Missing required fields: currentPassword, newPassword",
        { missingFields: validation.missingFields }
      );
      return;
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      context.res = UnifiedResponseHandler.validationError(
        "New password must be at least 8 characters long"
      );
      return;
    }

    // Extract and verify token using UnifiedAuthService
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.error(
        "UNAUTHORIZED",
        "Missing or invalid authorization token",
        401
      );
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token using UnifiedAuthService
    let decoded;
    try {
      decoded = UnifiedAuthService.verifyToken(token);
      if (!decoded) {
        context.res = UnifiedResponseHandler.error(
          "INVALID_TOKEN",
          "Invalid or expired token",
          401
        );
        return;
      }
    } catch (jwtError) {
      context.log("JWT verification error:", jwtError);
      context.res = UnifiedResponseHandler.error(
        "INVALID_TOKEN",
        "Invalid or expired token",
        401
      );
      return;
    }

    // Change password using UnifiedAuthService
    const changeResult = await UnifiedAuthService.changePassword(
      decoded.userId,
      currentPassword,
      newPassword
    );

    if (changeResult.success) {
      context.log("Password changed successfully for user:", decoded.userId);
      context.res = UnifiedResponseHandler.success({
        message: "Password changed successfully",
        userId: decoded.userId,
      });
    } else {
      context.res = UnifiedResponseHandler.error(
        changeResult.error?.code || "PASSWORD_CHANGE_FAILED",
        changeResult.error?.message || "Failed to change password",
        changeResult.error?.statusCode || 400
      );
    }
  } catch (error) {
    context.log("Change password error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};
