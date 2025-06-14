"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");

async function secureSimpleLoginHandler(request, context) {
  try {
    console.log("Secure simple login handler started");
    // Add CORS headers
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return {
        status: 200,
        headers,
      };
    }

    console.log("Parsing request body");
    const body = await request.text();
    console.log("Raw body:", body);
    let requestData;

    try {
      requestData = JSON.parse(body);
    } catch (e) {
      console.log("JSON parse error:", e);
      return {
        status: 400,
        headers,
        jsonBody: {
          success: false,
          error: "Invalid JSON",
        },
      };
    }

    console.log("Parsed request data:", requestData);
    const { email, password } = requestData;

    // Validate required fields
    if (!email || !password) {
      console.log("Missing email or password");
      return {
        status: 400,
        headers,
        jsonBody: {
          success: false,
          error: "Email and password required",
        },
      };
    }

    // Authenticate against registered users only - no hardcoded bypasses
    const {
      UnifiedAuthService,
    } = require("../../services/unified-auth.service");
    const authResult = await UnifiedAuthService.authenticate(email, password);

    if (authResult.success) {
      console.log("Authentication successful for user:", authResult.user.id);
      return {
        status: 200,
        headers,
        jsonBody: {
          success: true,
          data: {
            user: authResult.user,
            token: authResult.accessToken,
            refreshToken: authResult.refreshToken,
          },
        },
      };
    }

    console.log("Invalid credentials for email:", email);
    return {
      status: 401,
      headers,
      jsonBody: {
        success: false,
        error: "Invalid email or password",
      },
    };
  } catch (error) {
    console.error("Secure simple login handler error:", error);
    return {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

functions_1.app.http("auth-login-simple-secure", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/login-simple-secure",
  handler: secureSimpleLoginHandler,
});
