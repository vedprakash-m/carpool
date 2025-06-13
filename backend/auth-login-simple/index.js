const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("Simple login function started");

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Parse request body
    const body = await UnifiedResponseHandler.parseJsonBody(req);
    const { email, password } = body || {};

    context.log("Login attempt for:", email);

    // Validate required fields
    const validation = UnifiedResponseHandler.validateRequiredFields(
      { email, password },
      ["email", "password"]
    );

    if (!validation.isValid) {
      context.res = UnifiedResponseHandler.validationError(
        "Email and password are required",
        { missingFields: validation.missingFields }
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
    context.log("Simple login error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};
