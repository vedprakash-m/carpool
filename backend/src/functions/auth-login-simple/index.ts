import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UnifiedAuthService } from "../../services/unified-auth.service";
import UnifiedResponseHandler from "../../utils/unified-response.service";
import { authCors } from "../../middleware";

async function simpleLoginHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    console.log("Simple login handler started");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return UnifiedResponseHandler.preflight();
    }

    // Parse request body
    const body = await UnifiedResponseHandler.parseJsonBody(request);
    const { email, password } = body;

    console.log("Login attempt for:", email);

    // Validate required fields
    const validation = UnifiedResponseHandler.validateRequiredFields(
      { email, password },
      ["email", "password"]
    );

    if (!validation.isValid) {
      return UnifiedResponseHandler.validationError(
        "Email and password are required",
        { missingFields: validation.missingFields }
      );
    }

    // Authenticate user
    const authResult = await UnifiedAuthService.authenticate(email, password);

    if (authResult.success) {
      return UnifiedResponseHandler.success({
        user: authResult.user,
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      });
    } else {
      return UnifiedResponseHandler.error(
        authResult.error?.code || "AUTHENTICATION_FAILED",
        authResult.error?.message || "Invalid credentials",
        authResult.error?.statusCode || 401
      );
    }
  } catch (error) {
    console.error("Simple login handler error:", error);
    return UnifiedResponseHandler.handleException(error);
  }
}

app.http("auth-login-simple", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/login-simple",
  handler: simpleLoginHandler,
});
