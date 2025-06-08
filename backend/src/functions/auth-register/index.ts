import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  registerSchema,
  ApiResponse,
  AuthResponse,
  User,
  Family,
  Child,
} from "@vcarpool/shared";
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import { FamilyService } from "../../services/family.service";
import { ChildService } from "../../services/child.service";
import { compose, cors, errorHandler, validateBody } from "../../middleware";
import { container } from "../../container";
import { logger } from "../../utils/logger";

async function registerHandler(
  request: HttpRequest & { validatedBody: any },
  context: InvocationContext
): Promise<HttpResponseInit> {
  const {
    parent: parentData,
    children: childrenData,
    familyName,
    secondParent: secondParentData,
  } = request.validatedBody;

  const authService = container.authService;
  const userService = container.userService;
  const familyService = container.familyService;
  const childService = container.childService;
  const logger = container.loggers.auth;

  // 1. Check if primary parent already exists
  const existingUser = await userService.getUserByEmail(parentData.email);
  if (existingUser) {
    logger.warn("Registration attempt for existing email", {
      email: parentData.email,
    });
    return {
      status: 409,
      jsonBody: {
        success: false,
        error: "A user with this email already exists.",
      },
    };
  }

  // Use a transaction to ensure all or nothing is created.
  // This is a conceptual representation. Actual implementation depends on the DB layer.
  try {
    // 2. Create Parents
    const primaryPasswordHash = await authService.hashPasswordInstance(
      parentData.password
    );
    const primaryParent = await userService.createUser({
      ...parentData,
      passwordHash: primaryPasswordHash,
      role: "parent",
    });

    let secondParent: User | null = null;
    if (secondParentData) {
      const secondPasswordHash = await authService.hashPasswordInstance(
        secondParentData.password
      );
      secondParent = await userService.createUser({
        ...secondParentData,
        passwordHash: secondPasswordHash,
        role: "parent",
      });
    }

    const parentIds = [primaryParent.id];
    if (secondParent) {
      parentIds.push(secondParent.id);
    }

    // 3. Create the Family
    const family = await familyService.createFamily(
      familyName,
      primaryParent.id,
      parentIds
    );

    // 4. Create the Children and link them to the family
    const children: Child[] = await Promise.all(
      childrenData.map((childData: any) =>
        childService.createChild(family.id, childData)
      )
    );

    // 5. Update the family with child IDs
    const childIds = children.map((c) => c.id);
    await familyService.updateFamily(family.id, {
      ...family,
      childIds,
      updatedAt: new Date(),
    });

    // 6. Generate tokens for the primary parent for auto-login
    const accessToken = authService.generateAccessTokenInstance(primaryParent);
    const refreshToken =
      authService.generateRefreshTokenInstance(primaryParent);

    const userToReturn: Partial<User> = { ...primaryParent };
    delete (userToReturn as any).passwordHash;

    return {
      status: 201,
      jsonBody: {
        success: true,
        data: {
          user: userToReturn,
          token: accessToken,
          refreshToken,
          familyId: family.id,
        },
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("Error during registration transaction", {
      error: errorMessage,
    });
    // TODO: Add compensating transaction logic to roll back created users/family
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: "An error occurred during registration.",
      },
    };
  }
}

export const main = compose(
  cors,
  errorHandler,
  validateBody(registerSchema)
)(registerHandler);

app.http("auth-register", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "auth/register",
  handler: main,
});
