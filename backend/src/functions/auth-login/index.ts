import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { loginSchema, ApiResponse, AuthResponse } from "@vcarpool/shared";
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import { compose, cors, errorHandler, validateBody } from "../../middleware";
import { UserRepository } from "../../repositories/user.repository";
import { logger } from "../../utils/logger";

async function loginHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    console.log("Login handler started");
    console.log("Request body:", request.validatedBody);

    const { email, password } = request.validatedBody;

    const authService = new AuthService(
      new UserRepository(null as any),
      logger
    );

    console.log("About to call UserService.getUserByEmail with:", email);

    // Find user by email
    const userWithPassword = await UserService.getUserByEmail(email);
    console.log(
      "UserService.getUserByEmail result:",
      userWithPassword ? "User found" : "User not found"
    );

    if (!userWithPassword) {
      console.log("Returning 401 for user not found");
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: "Invalid email or password",
        } as ApiResponse,
      };
    }

    console.log("About to verify password");
    // Verify password
    const isPasswordValid = await authService.verifyPasswordInstance(
      password,
      userWithPassword.passwordHash
    );
    console.log("Password verification result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Returning 401 for invalid password");
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: "Invalid email or password",
        } as ApiResponse,
      };
    }

    console.log("About to generate tokens");
    // Remove password hash from user object
    const { passwordHash, ...user } = userWithPassword;

    // Generate tokens
    const accessToken = AuthService.generateAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    console.log("Login successful");
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          user,
          token: accessToken,
          refreshToken,
        },
      } as ApiResponse<AuthResponse>,
    };
  } catch (error) {
    console.error("Login handler error:", error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      } as ApiResponse,
    };
  }
}

app.http("auth-login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/login",
  handler: compose(cors, errorHandler, validateBody(loginSchema))(loginHandler),
});
