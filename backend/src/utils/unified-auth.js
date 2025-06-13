/**
 * Unified Authentication System
 * Consolidates 8+ different authentication implementations
 * Part of the technical debt resolution plan
 */

const jwt = require("jsonwebtoken");
const { MockDataFactory } = require("./mock-data-wrapper");
const { createErrorResponse } = require("./unified-response");

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-for-development";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default-refresh-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Role permissions mapping
const ROLE_PERMISSIONS = {
  admin: [
    "create_users",
    "generate_schedule",
    "view_all_data",
    "manage_system",
    "manage_groups",
    "manage_roles",
  ],
  group_admin: [
    "manage_group",
    "assign_trips",
    "view_group_data",
    "manage_group_members",
    "submit_preferences",
  ],
  parent: [
    "submit_preferences",
    "view_own_trips",
    "manage_children",
    "edit_profile",
    "view_group_schedule",
  ],
  child: ["view_own_schedule", "update_limited_profile", "view_assignments"],
  student: ["view_own_schedule", "update_limited_profile", "view_assignments"],
  trip_admin: [
    "manage_trip",
    "assign_passengers",
    "view_trip_data",
    "manage_trip_schedule",
    "submit_preferences",
  ],
};

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || [],
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify JWT token
 */
function verifyToken(token, isRefreshToken = false) {
  try {
    const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    return { success: true, payload: decoded };
  } catch (error) {
    return {
      success: false,
      error:
        error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      message: error.message,
    };
  }
}

/**
 * Authenticate user credentials (for login)
 */
async function authenticateUser(email, password, context) {
  try {
    context.log(`Authentication attempt for email: ${email}`);

    // Get standard users for development/testing
    const standardUsers = MockDataFactory.getStandardUserSet();
    const allUsers = [
      standardUsers.admin,
      ...standardUsers.parents,
      ...standardUsers.students,
      standardUsers.tripAdmin,
    ];

    // Find user by email
    const user = allUsers.find((u) => u.email === email);

    if (!user) {
      context.log(`User not found: ${email}`);
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      };
    }

    // For development, check against known passwords or allow test passwords
    const validPasswords = [
      "test-admin-password",
      "test-parent-password",
      "test-student-password",
      "test-password",
      process.env.ADMIN_PASSWORD,
      process.env.TEST_PASSWORD,
    ].filter(Boolean);

    const isValidPassword = validPasswords.includes(password);

    if (!isValidPassword) {
      context.log(`Invalid password for user: ${email}`);
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      };
    }

    context.log(
      `Authentication successful for user: ${email}, role: ${user.role}`
    );

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove sensitive data
    const { hashedPassword, ...safeUser } = user;

    return {
      success: true,
      user: safeUser,
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
    };
  } catch (error) {
    context.log.error("Authentication error:", error);
    return {
      success: false,
      error: "AUTHENTICATION_ERROR",
      message: "Authentication failed",
    };
  }
}

/**
 * Authorize request with JWT token
 */
function authorizeRequest(
  authHeader,
  requiredRoles = [],
  requiredPermissions = []
) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: createErrorResponse(
        "UNAUTHORIZED",
        "Missing or invalid authorization token",
        401
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  const verification = verifyToken(token);

  if (!verification.success) {
    return {
      success: false,
      error: createErrorResponse(verification.error, verification.message, 401),
    };
  }

  const { payload } = verification;

  // Check role authorization
  if (requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
    return {
      success: false,
      error: createErrorResponse(
        "FORBIDDEN",
        "Insufficient role permissions",
        403
      ),
    };
  }

  // Check permission authorization
  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some((permission) =>
      payload.permissions.includes(permission)
    );

    if (!hasPermission) {
      return {
        success: false,
        error: createErrorResponse(
          "FORBIDDEN",
          "Insufficient permissions",
          403
        ),
      };
    }
  }

  return {
    success: true,
    user: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken, context) {
  try {
    const verification = verifyToken(refreshToken, true);

    if (!verification.success) {
      return {
        success: false,
        error: verification.error,
        message: verification.message,
      };
    }

    const { payload } = verification;

    // Get updated user data
    const standardUsers = MockDataFactory.getStandardUserSet();
    const allUsers = [
      standardUsers.admin,
      ...standardUsers.parents,
      ...standardUsers.students,
      standardUsers.tripAdmin,
    ];

    const user = allUsers.find((u) => u.id === payload.userId);

    if (!user) {
      return {
        success: false,
        error: "USER_NOT_FOUND",
        message: "User not found",
      };
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRES_IN,
    };
  } catch (error) {
    context.log.error("Token refresh error:", error);
    return {
      success: false,
      error: "TOKEN_REFRESH_ERROR",
      message: "Failed to refresh token",
    };
  }
}

/**
 * Create authentication response for login success
 */
function createAuthResponse(authResult, message = "Authentication successful") {
  if (!authResult.success) {
    return createErrorResponse(authResult.error, authResult.message, 401);
  }

  return {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success: true,
      message,
      data: {
        user: authResult.user,
        token: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresIn: authResult.expiresIn,
      },
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Get user permissions for a role
 */
function getUserPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user has specific permission
 */
function hasPermission(userRole, permission) {
  const permissions = getUserPermissions(userRole);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the required roles
 */
function hasRole(userRole, requiredRoles) {
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles];
  }
  return requiredRoles.includes(userRole);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticateUser,
  authorizeRequest,
  refreshAccessToken,
  createAuthResponse,
  getUserPermissions,
  hasPermission,
  hasRole,
  ROLE_PERMISSIONS,
};
