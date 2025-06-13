const { CosmosClient } = require("@azure/cosmos");
const { UnifiedAuthService } = require("../src/services/unified-auth.service");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

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

  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      context.res = UnifiedResponseHandler.preflight();
      return;
    }

    // Parse request body
    const body = await UnifiedResponseHandler.parseJsonBody(req);
    const { email, password } = body || {};

    context.log("Login attempt for email:", email);

    // Validate required fields
    const validation = UnifiedResponseHandler.validateRequiredFields(
      { email, password },
      ["email", "password"]
    );

    if (!validation.isValid) {
      context.res = UnifiedResponseHandler.validationError(
        "Email and password are required",
        { missingFields: validation.missingFields }
      );
      return;
    }

    // Try database authentication first
    const dbAuthResult = await authenticateWithDatabase(
      email,
      password,
      context
    );

    if (dbAuthResult.success) {
      context.res = UnifiedResponseHandler.success({
        user: dbAuthResult.user,
        token: dbAuthResult.accessToken,
        refreshToken: dbAuthResult.refreshToken,
      });
      return;
    }

    // Fallback to unified mock authentication system
    context.log("Database auth failed, falling back to unified mock auth");
    const mockAuthResult = await UnifiedAuthService.authenticate(
      email,
      password
    );

    if (mockAuthResult.success) {
      context.res = UnifiedResponseHandler.success({
        user: mockAuthResult.user,
        token: mockAuthResult.accessToken,
        refreshToken: mockAuthResult.refreshToken,
      });
    } else {
      context.res = UnifiedResponseHandler.error(
        mockAuthResult.error?.code || "AUTHENTICATION_FAILED",
        mockAuthResult.error?.message || "Invalid credentials",
        mockAuthResult.error?.statusCode || 401
      );
    }
  } catch (error) {
    context.log("Database login error:", error);
    context.res = UnifiedResponseHandler.handleException(error);
  }
};

/**
 * Authenticate user against Cosmos DB using unified auth patterns
 */
async function authenticateWithDatabase(email, password, context) {
  try {
    // Query user by email
    const query = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }],
    };

    const { resources: users } = await usersContainer.items
      .query(query)
      .fetchAll();

    if (users.length === 0) {
      context.log("User not found in database for email:", email);
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      };
    }

    const user = users[0];
    context.log("User found in database:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      context.log("Password verification failed for database user:", user.id);
      return {
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      };
    }

    context.log("Database authentication successful for user:", user.id);

    // Generate tokens using unified auth system
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Prepare user response (exclude sensitive data)
    const { hashedPassword, ...safeUser } = user;

    return {
      success: true,
      user: safeUser,
      accessToken,
      refreshToken,
      expiresIn: "24h",
    };
  } catch (error) {
    context.log("Database authentication error:", error);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Database authentication failed",
    };
  }
}
