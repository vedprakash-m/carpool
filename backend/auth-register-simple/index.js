const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

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
  context.log("User registration function started");
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
    const { email, password, firstName, lastName, phoneNumber, department } =
      req.body || {};

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Email, password, first name, and last name are required",
        },
      };
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Invalid email format",
        },
      };
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: {
          success: false,
          error: "Password must be at least 8 characters long",
        },
      };
      return;
    }

    context.log("Attempting registration for email:", email);

    try {
      // Check if user already exists in database
      const query = {
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }],
      };

      const { resources: existingUsers } = await usersContainer.items
        .query(query)
        .fetchAll();

      if (existingUsers.length > 0) {
        context.log("User already exists for email:", email);
        context.res = {
          status: 409,
          headers: corsHeaders,
          body: {
            success: false,
            error: "User with this email already exists",
          },
        };
        return;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user object
      const newUser = {
        id: uuidv4(),
        email: email.toLowerCase(),
        hashedPassword: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber || null,
        department: department || null,
        role: "parent", // Default role for new registrations
        homeAddress: null,
        isActiveDriver: false,
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
          isDriver: false,
          smokingAllowed: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save user to database
      const { resource: createdUser } = await usersContainer.items.create(
        newUser
      );
      context.log("User created successfully:", createdUser.id);

      // Generate JWT tokens
      const tokenPayload = {
        userId: createdUser.id,
        email: createdUser.email,
        role: createdUser.role,
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
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
        phoneNumber: createdUser.phoneNumber,
        department: createdUser.department,
        homeAddress: createdUser.homeAddress,
        isActiveDriver: createdUser.isActiveDriver,
        preferences: createdUser.preferences,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      };

      context.log("Registration successful for user:", createdUser.id);

      // Return the format expected by frontend
      context.res = {
        status: 201,
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
    } catch (dbError) {
      context.log("Database registration error:", dbError.message);

      // Fallback to mock registration for development
      context.log("Fallback to mock registration for:", email);

      const mockUser = {
        id: uuidv4(),
        email: email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        role: "parent",
        phoneNumber: phoneNumber || null,
        department: department || null,
        homeAddress: null,
        isActiveDriver: false,
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
          isDriver: false,
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
        status: 201,
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
    }
  } catch (error) {
    context.log("Registration error:", error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: {
        success: false,
        error: "Registration failed. Please try again later.",
      },
    };
  }
};
