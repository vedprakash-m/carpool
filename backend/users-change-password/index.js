const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock database for immediate functionality (replace with Cosmos DB later)
let mockUsers = [
  {
    id: "admin-1",
    email: "admin@example.com", // Mock admin for testing
    hashedPassword:
      "$2a$12$5P8P9P9P9P9P9P9P9P9P9O9P9P9P9P9P9P9P9P9P9P9P9P9P9P9P9P", // Admin123!
    firstName: "System",
    lastName: "Administrator",
    role: "admin",
  },
];

module.exports = async function (context, req) {
  // Set CORS headers
  context.res = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT, OPTIONS",
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

  // Only allow PUT method
  if (req.method !== "PUT") {
    context.res.status = 405;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only PUT method is allowed",
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

    // Verify JWT token
    let currentUser;
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "temp-jwt-secret-vcarpool"
      );
      currentUser = mockUsers.find((u) => u.id === decoded.userId);
      if (!currentUser) {
        context.res.status = 401;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: currentPassword, newPassword",
        },
      });
      return;
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "New password must be at least 8 characters long",
        },
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      currentUser.hashedPassword
    );
    if (!isCurrentPasswordValid) {
      context.res.status = 400;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect",
        },
      });
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    const userIndex = mockUsers.findIndex((u) => u.id === currentUser.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        hashedPassword: newHashedPassword,
        updatedAt: new Date().toISOString(),
      };
    }

    // Return success response
    context.res.status = 200;
    context.res.body = JSON.stringify({
      success: true,
      data: {
        message: "Password changed successfully",
      },
    });
  } catch (error) {
    context.log.error("Change password error:", error);

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
