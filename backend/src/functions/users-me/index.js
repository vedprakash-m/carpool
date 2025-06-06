module.exports = async function (context, req) {
  context.log("Users me function started");
  context.log("Request method:", req.method);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    // Return current user data
    // In a real app, this would verify the JWT token and get user from DB
    const user = {
      id: "ved-admin-id",
      email: "mi.vedprakash@gmail.com",
      firstName: "Ved",
      lastName: "Mishra",
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
    };

    context.log("Returning user data for:", user.email);

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: {
        success: true,
        data: user,
      },
    };
  } catch (error) {
    context.log("Users me error:", error);
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
