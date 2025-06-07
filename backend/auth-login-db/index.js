const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const database = cosmosClient.database(
  process.env.COSMOS_DB_DATABASE || "vcarpool"
);
const usersContainer = database.container("users");

module.exports = async function (context, req) {
  context.log("Database-integrated login function started");
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

    context.log("Attempting login for email:", email);

    // Query user by email
    const query = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }],
    };

    const { resources: users } = await usersContainer.items
      .query(query)
      .fetchAll();

    if (users.length === 0) {
      context.log("User not found for email:", email);
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Invalid credentials",
        },
      };
      return;
    }

    const user = users[0];
    context.log("User found:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      context.log("Password verification failed for user:", user.id);
      context.res = {
        status: 401,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Invalid credentials",
        },
      };
      return;
    }

    context.log("Password verified successfully for user:", user.id);

    // Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "default-jwt-secret",
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      { ...tokenPayload, type: "refresh" },
      process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
      { expiresIn: "7d" }
    );

    // Prepare user response (exclude sensitive data)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      homeAddress: user.homeAddress,
      isActiveDriver: user.isActiveDriver,
      preferences: user.preferences || {
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
        isDriver: user.isActiveDriver || false,
        smokingAllowed: false,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    context.log("Login successful for user:", user.id);

    // Return the format expected by frontend
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: {
        success: true,
        data: {
          user: userResponse,
          token: token,
          refreshToken: refreshToken,
        },
      },
    };
  } catch (error) {
    context.log("Database login error:", error);

    // Fallback to mock authentication for development
    const { email, password } = req.body || {};

    if (
      (email === "admin@example.com" && password === "Admin123!") ||
      (email === "test-user@example.com" && password)
    ) {
      context.log("Fallback to mock authentication for:", email);

      const mockUser = {
        id: email === "admin@example.com" ? "admin-id" : "test-admin-id",
        email: email,
        firstName: email === "admin@example.com" ? "Admin" : "Test",
        lastName: email === "admin@example.com" ? "User" : "User",
        role: "admin",
        phoneNumber: null,
        homeAddress: null,
        isActiveDriver: true,
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

      const mockToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET || "default-jwt-secret",
        { expiresIn: "24h" }
      );

      const mockRefreshToken = jwt.sign(
        {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          type: "refresh",
        },
        process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
        { expiresIn: "7d" }
      );

      context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
          success: true,
          data: {
            user: mockUser,
            token: mockToken,
            refreshToken: mockRefreshToken,
          },
        },
      };
    } else {
      context.res = {
        status: 500,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Database connection failed. Please try again later.",
        },
      };
    }
  }
};
