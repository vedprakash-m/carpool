"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
async function simpleLoginHandler(request, context) {
  try {
    console.log("Simple login handler started");
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
    // For now, let's just test with our known admin user
    if (
      email === "admin@vcarpool.com" &&
      password === (process.env.ADMIN_PASSWORD || "test-admin-password")
    ) {
      console.log("Returning success for admin user");
      return {
        status: 200,
        headers,
        jsonBody: {
          success: true,
          data: {
            user: {
              id: "test-admin-id",
              email: "admin@vcarpool.com",
              firstName: "Admin",
              lastName: "User",
              role: "admin",
            },
            token: "test-token",
            refreshToken: "test-refresh-token",
          },
        },
      };
    }
    console.log("Invalid credentials");
    return {
      status: 401,
      headers,
      jsonBody: {
        success: false,
        error: "Invalid email or password",
      },
    };
  } catch (error) {
    console.error("Simple login handler error:", error);
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
functions_1.app.http("auth-login-simple", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "auth/login-simple",
  handler: simpleLoginHandler,
});
