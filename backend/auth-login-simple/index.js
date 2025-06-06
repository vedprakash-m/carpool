module.exports = async function (context, req) {
  // Enhanced CORS headers for Azure Static Web Apps
  const corsHeaders = {
    "Access-Control-Allow-Origin":
      "https://lively-stone-016bfa20f.6.azurestaticapps.net",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: null,
    };
    return;
  }

  // Handle POST login request
  if (req.method === "POST") {
    try {
      context.log("Full request body:", JSON.stringify(req.body));
      context.log("Content-Type:", req.headers["content-type"]);

      const { email, password } = req.body || {};

      context.log("Login attempt for:", email);
      context.log("Password provided:", password ? "YES" : "NO");

      // Simple authentication check - allow multiple admin accounts
      if (
        (email === "admin@vcarpool.com" ||
          email === "mi.vedprakash@gmail.com") &&
        password === "Admin123!"
      ) {
        context.res = {
          status: 200,
          headers: corsHeaders,
          body: {
            success: true,
            data: {
              user: {
                id:
                  email === "mi.vedprakash@gmail.com"
                    ? "ved-admin-id"
                    : "admin-id",
                email: email,
                firstName:
                  email === "mi.vedprakash@gmail.com" ? "Ved" : "Admin",
                lastName:
                  email === "mi.vedprakash@gmail.com" ? "Prakash" : "User",
                role: "admin",
                phoneNumber: null,
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
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token",
              refreshToken:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-refresh-token",
            },
          },
        };
      } else {
        context.log("Authentication failed for:", email);
        context.log("Expected: admin@vcarpool.com / Admin123!");
        context.log(
          "Received: " + email + " / " + (password ? password : "NO_PASSWORD")
        );

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
          error: "Internal server error",
        },
      };
    }
  } else {
    // Method not allowed
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: {
        success: false,
        error: "Method not allowed",
      },
    };
  }
};
