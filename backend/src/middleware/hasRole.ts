import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserRole } from "@vcarpool/shared";

export const hasRole = (allowedRoles: UserRole[]) => {
  return (
    handler: (
      request: HttpRequest,
      context: InvocationContext
    ) => Promise<HttpResponseInit> | HttpResponseInit
  ) => {
    return async (
      request: HttpRequest,
      context: InvocationContext
    ): Promise<HttpResponseInit> => {
      const user = (request as any).user;

      if (!user || !user.role) {
        return {
          status: 401,
          jsonBody: { success: false, error: "Unauthorized" },
        };
      }

      if (!allowedRoles.includes(user.role)) {
        return {
          status: 403,
          jsonBody: { success: false, error: "Forbidden" },
        };
      }

      return handler(request, context);
    };
  };
};
