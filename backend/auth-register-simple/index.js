// Simplified version without database dependencies for immediate functionality

module.exports = async function (context, req) {
  context.log("Registration function called");

  // CORS headers for all responses
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
    context.log("CORS preflight request");
    context.res = {
      status: 200,
      headers: corsHeaders,
    };
    return;
  }

  try {
    context.log("Processing registration request");

    // For now, just return a simple success response
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: {
        success: true,
        message: "Registration endpoint is working",
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    context.log("Error in registration function:", error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: {
        success: false,
        error: "Internal server error",
        message: error.message,
      },
    };
  }
};
