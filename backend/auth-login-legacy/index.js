const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Legacy login function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Parse request body
    const body = await UnifiedResponseHandler.parseJsonBody(req);
    const { email, password } = body || {};

    context.log("Login attempt for email:", email);

    // Validate required fields
    if (!email || !password) {
      context.res = UnifiedResponseHandler.validationError(
        "Email and password are required"
      );
      return;
    }

    // Authenticate user
    const authResult = await UnifiedAuthService.authenticate(email, password);

    if (authResult.success) {
      context.res = UnifiedResponseHandler.success({
        user: authResult.user,
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      });
    } else {
      context.res = UnifiedResponseHandler.error(
        authResult.error?.code || "AUTHENTICATION_FAILED",
        authResult.error?.message || "Invalid credentials",
        authResult.error?.statusCode || 401
      );
    }
  } catch (error) {
    context.log("Legacy login error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};
