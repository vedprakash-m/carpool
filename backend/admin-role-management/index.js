const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Mock user storage (replace with actual database in production)
let mockUsers = [
  {
    id: "admin-1",
    email: "admin@example.com",
    firstName: "Super",
    lastName: "Admin",
    role: "admin",
    hashedPassword: "$2a$12$mockHashedPasswordForAdmin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "parent-1",
    email: "parent1@example.com",
    firstName: "John",
    lastName: "Smith",
    role: "parent",
    hashedPassword: "$2a$12$mockHashedPasswordForParent1",
    homeAddress: "123 Main St, Springfield",
    isActiveDriver: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "parent-2",
    email: "parent2@example.com",
    firstName: "Sarah",
    lastName: "Johnson",
    role: "parent",
    hashedPassword: "$2a$12$mockHashedPasswordForParent2",
    homeAddress: "456 Oak Ave, Springfield",
    isActiveDriver: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

module.exports = async function (context, req) {
  try {
    // Set CORS headers
    context.res = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
      },
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      context.res.status = 200;
      context.res.body = "";
      return;
    }

    // Authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      context.res.status = 401;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
      return;
    }

    // Simple token validation (replace with actual JWT validation)
    const token = authHeader.split(" ")[1];
    if (!token.includes("admin")) {
      context.res.status = 403;
      context.res.body = JSON.stringify({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Super Admin access required",
        },
      });
      return;
    }

    const method = req.method;
    const action = req.query.action;

    if (method === "GET") {
      // List all users with their roles for role management
      const users = mockUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActiveDriver: user.isActiveDriver,
        homeAddress: user.homeAddress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          users,
          message: "Users retrieved successfully",
        },
      });
      return;
    }

    if (method === "PUT" && action === "promote") {
      const { userId, newRole } = req.body;

      // Validation
      if (!userId || !newRole) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "userId and newRole are required",
          },
        });
        return;
      }

      // Validate role
      const validRoles = ["parent", "trip_admin", "admin", "student"];
      if (!validRoles.includes(newRole)) {
        context.res.status = 400;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid role. Must be one of: parent, trip_admin, admin, student",
          },
        });
        return;
      }

      // Find user
      const userIndex = mockUsers.findIndex((u) => u.id === userId);
      if (userIndex === -1) {
        context.res.status = 404;
        context.res.body = JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
        return;
      }

      const user = mockUsers[userIndex];
      const oldRole = user.role;

      // Prevent demoting the last admin
      if (oldRole === "admin" && newRole !== "admin") {
        const adminCount = mockUsers.filter((u) => u.role === "admin").length;
        if (adminCount <= 1) {
          context.res.status = 400;
          context.res.body = JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Cannot demote the last Super Admin",
            },
          });
          return;
        }
      }

      // Update user role
      mockUsers[userIndex] = {
        ...user,
        role: newRole,
        updatedAt: new Date().toISOString(),
      };

      const updatedUser = {
        id: mockUsers[userIndex].id,
        email: mockUsers[userIndex].email,
        firstName: mockUsers[userIndex].firstName,
        lastName: mockUsers[userIndex].lastName,
        role: mockUsers[userIndex].role,
        isActiveDriver: mockUsers[userIndex].isActiveDriver,
        homeAddress: mockUsers[userIndex].homeAddress,
        updatedAt: mockUsers[userIndex].updatedAt,
      };

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          user: updatedUser,
          message: `User role updated from ${oldRole} to ${newRole}`,
          roleChange: {
            from: oldRole,
            to: newRole,
            userId: userId,
            timestamp: new Date().toISOString(),
          },
        },
      });
      return;
    }

    if (method === "GET" && action === "eligible-trip-admins") {
      // Get parents who are eligible to be promoted to trip admin
      const eligibleParents = mockUsers
        .filter((user) => user.role === "parent" && user.isActiveDriver)
        .map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActiveDriver: user.isActiveDriver,
          homeAddress: user.homeAddress,
        }));

      context.res.status = 200;
      context.res.body = JSON.stringify({
        success: true,
        data: {
          eligibleParents,
          message:
            "Eligible parents for Trip Admin role retrieved successfully",
        },
      });
      return;
    }

    // Invalid method or action
    context.res.status = 405;
    context.res.body = JSON.stringify({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: `Method ${method} not allowed`,
      },
    });
  } catch (error) {
    context.log.error("Admin role management error:", error);

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
