const { UnifiedAuthService } = require("../../services/unified-auth.service");

module.exports = async function (context, req) {
  context.log("Secure legacy login function started");
  context.log("Request method:", req.method);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
    };
    return;
  }

  try {
    const { email, password } = req.body || {};

    context.log("Login attempt for email:", email);

    // Validate input
    if (!email || !password) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Email and password are required",
        },
      };
      return;
    }

    // Authenticate against registered users only - no bypasses or fallbacks
    const authResult = await UnifiedAuthService.authenticate(email, password);

    if (authResult.success) {
      context.log("Authentication successful for user:", authResult.user.id);
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
          success: true,
          data: {
            user: authResult.user,
            token: authResult.accessToken,
            refreshToken: authResult.refreshToken,
          },
        },
      };
    } else {
      context.log("Authentication failed for email:", email);
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Invalid email or password",
        },
      };
    }
  } catch (error) {
    context.log("Login error:", error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: {
        success: false,
        error: "Internal server error",
      },
    };
  }
};
