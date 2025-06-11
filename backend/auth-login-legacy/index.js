module.exports = async function (context, req) {
  context.log("Login function started");
  context.log("Request method:", req.method);
  context.log("Request body:", req.body);

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

    context.log("Extracted email:", email);
    context.log(
      "Extracted password length:",
      password ? password.length : "undefined"
    );

    // Check for both test admin and original admin
    if (
      (email === "admin@example.com" &&
        password === (process.env.ADMIN_PASSWORD || "test-admin-password")) ||
      (email === "test-user@example.com" && password)
    ) {
      context.log("Login successful for email:", email);

      // Return the format expected by frontend: { success: true, data: { user, token, refreshToken } }
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
          success: true,
          data: {
            user: {
              id: email === "admin@example.com" ? "admin-id" : "test-admin-id",
              email: email,
              firstName: email === "admin@example.com" ? "Admin" : "Test",
              lastName: email === "admin@example.com" ? "User" : "User",
              role: "admin",
              profilePicture: null,
              phoneNumber: null,
              organizationId: null,
              preferences: {
                notifications: {
                  email: true,
                  push: true,
                  sms: false,
                  tripReminders: true,
                  swapRequests: true,
                  scheduleChanges: true,
                },
                privacy: {
                  showPhoneNumber: true,
                  showEmail: false,
                },
                pickupLocation: "Home",
                dropoffLocation: "School",
                preferredTime: "08:00",
                isDriver: true,
                smokingAllowed: false,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            token: "mock-jwt-token-for-testing-only", // Mock JWT for development/testing
            refreshToken: "mock-refresh-token-for-testing-only", // Mock refresh token for development/testing
          },
        },
      };
    } else {
      context.log("Login failed for email:", email);
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Invalid credentials",
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
        error: error.message,
      },
    };
  }
};
