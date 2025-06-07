const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock database for immediate functionality (replace with Cosmos DB later)
const mockUsers = [];

module.exports = async function (context, req) {
  // Set CORS headers
  context.res = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With",
      "Content-Type": "application/json",
    },
  };

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    context.res.status = 200;
    context.res.body = "";
    return;
  }

  // Only allow POST method
  if (req.method !== "POST") {
    context.res.status = 405;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST method is allowed",
      },
    });
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res.status = 401;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization token",
        },
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token and check admin role
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "temp-jwt-secret-vcarpool"
      );
      if (decoded.role !== "admin") {
        context.res.status = 403;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admin role required for this operation",
          },
        });
        return;
      }
    } catch (jwtError) {
      context.res.status = 401;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token",
        },
      });
      return;
    }

    // Validate request body
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber,
      homeAddress,
      isActiveDriver,
    } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Missing required fields: email, password, firstName, lastName, role",
        },
      });
      return;
    }

    // Validate role
    if (!["parent", "student", "trip_admin"].includes(role)) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: 'Role must be either "parent", "student", or "trip_admin"',
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email format",
        },
      });
      return;
    }

    // Check if user already exists (mock check for now)
    const existingUser = mockUsers.find((u) => u.email === email);
    if (existingUser) {
      context.res.status = 409;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "CONFLICT",
          message: "User with this email already exists",
        },
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: uuidv4(),
      email,
      firstName,
      lastName,
      role,
      phoneNumber: phoneNumber || null,
      homeAddress: homeAddress || null,
      isActiveDriver:
        role === "parent" || role === "trip_admin"
          ? isActiveDriver || false
          : false,
      preferences: {
        pickupLocation: "",
        dropoffLocation: "",
        preferredTime: "",
        isDriver:
          role === "parent" || role === "trip_admin"
            ? isActiveDriver || false
            : false,
        maxPassengers: 4,
        smokingAllowed: false,
        musicPreference: "",
        notifications: {
          email: true,
          sms: false,
          tripReminders: true,
          swapRequests: true,
          scheduleChanges: true,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store user (mock storage for now)
    mockUsers.push({
      ...newUser,
      hashedPassword,
    });

    // Return user data (without password)
    context.res.status = 201;
    context.res.body = JSON.stringify({
      success: true,
      data: {
        user: newUser,
        message: `${
          role === "parent"
            ? "Parent"
            : role === "student"
            ? "Student"
            : "Trip Admin"
        } account created successfully. Initial password has been set.`,
      },
    });
  } catch (error) {
    context.log.error("Admin create user error:", error);

    context.res.status = 500;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error occurred",
      },
    });
  }
};
