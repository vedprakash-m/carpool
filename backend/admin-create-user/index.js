const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

// Mock database for immediate functionality (replace with Cosmos DB later)
const mockUsers = [];

module.exports = async function (context, req) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  // Only allow POST method
  if (req.method !== "POST") {
    context.res = UnifiedResponseHandler.methodNotAllowedError(
      "Only POST method allowed"
    );
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res = UnifiedResponseHandler.authError(
        "Missing or invalid authorization token"
      );
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
        context.res = UnifiedResponseHandler.forbiddenError(
          "Admin role required for this operation"
        );
        return;
      }
    } catch (jwtError) {
      context.res = UnifiedResponseHandler.authError(
        "Invalid or expired token"
      );
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
      context.res = UnifiedResponseHandler.validationError(
        "Missing required fields: email, password, firstName, lastName, role"
      );
      return;
    }

    // Validate role
    if (!["parent", "student", "trip_admin"].includes(role)) {
      context.res = UnifiedResponseHandler.validationError(
        'Role must be either "parent", "student", or "trip_admin"'
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res = UnifiedResponseHandler.validationError(
        "Invalid email format"
      );
      return;
    }

    // Check if user already exists (mock check for now)
    const existingUser = mockUsers.find((u) => u.email === email);
    if (existingUser) {
      context.res = UnifiedResponseHandler.conflictError(
        "User with this email already exists"
      );
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

    // Determine display role for response message
    const displayRole =
      role === "group_admin"
        ? "Group Admin"
        : role.charAt(0).toUpperCase() + role.slice(1);

    // Return user data (without password)
    context.res = UnifiedResponseHandler.created(
      {
        user: newUser,
      },
      `${displayRole} account created successfully. Initial password has been set.`
    );
  } catch (error) {
    context.log.error("Admin create user error:", error);
    context.res = UnifiedResponseHandler.internalError(
      "Internal server error occurred"
    );
  }
};
