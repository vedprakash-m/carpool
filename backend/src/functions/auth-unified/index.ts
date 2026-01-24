import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userDomainService } from '../../services/domains/user-domain.service';
import { authenticationService } from '../../services/auth/authentication.service';
import {
  CreateUserRequest,
  AuthCredentials,
  AuthResult,
  AuthUserResponse,
  AuthenticatedUser,
} from '@carpool/shared';
import jwt from 'jsonwebtoken';

/**
 * UNIFIED AUTHENTICATION ENDPOINT
 *
 * Single endpoint handling all authentication operations:
 * - POST /api/auth?action=login - User login
 * - POST /api/auth?action=register - User registration
 * - POST /api/auth?action=refresh - Token refresh
 * - POST /api/auth?action=logout - User logout
 * - POST /api/auth?action=forgot-password - Password reset request
 * - POST /api/auth?action=reset-password - Password reset confirmation
 * - POST /api/auth?action=change-password - Password change
 *
 * This consolidates all authentication functionality into a single,
 * maintainable endpoint using our unified authentication architecture.
 */
export async function authUnified(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Unified authentication endpoint called');

  try {
    const method = request.method;

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
    }

    if (method !== 'POST') {
      return {
        status: 405,
        jsonBody: {
          success: false,
          message: 'Method not allowed. Use POST.',
        },
      };
    }

    // Get action from query parameter
    const action = request.query.get('action');
    if (!action) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: 'Missing required query parameter: action',
          supportedActions: [
            'login',
            'register',
            'refresh',
            'logout',
            'forgot-password',
            'reset-password',
            'change-password',
          ],
        },
      };
    }

    const body = (await request.json()) as any;

    let result: AuthResult;

    switch (action) {
      case 'login':
        result = await handleLogin(body, context);
        break;

      case 'register':
        result = await handleRegister(body, context);
        break;

      case 'refresh':
        result = await handleRefresh(body, context);
        break;

      case 'logout':
        result = await handleLogout(body, context);
        break;

      case 'forgot-password':
        result = await handleForgotPassword(body, context);
        break;

      case 'reset-password':
        result = await handleResetPassword(body, context);
        break;

      case 'change-password':
        result = await handleChangePassword(body, request, context);
        break;

      default:
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: `Unsupported action: ${action}`,
            supportedActions: [
              'login',
              'register',
              'refresh',
              'logout',
              'forgot-password',
              'reset-password',
              'change-password',
            ],
          },
        };
    }

    return {
      status: result.success ? 200 : 400,
      jsonBody: result,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    context.error('Unified auth error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    };
  }
}

/**
 * Handle user login (password-based)
 *
 * @deprecated Password-based authentication is deprecated.
 * Use Entra ID login via the 'entra-login' action instead.
 * This endpoint will be removed in a future version.
 */
async function handleLogin(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('DEPRECATED: Processing password login request - use entra-login action instead');

  if (!body.email || !body.password) {
    return {
      success: false,
      message: 'Email and password are required',
    };
  }

  const credentials: AuthCredentials = {
    type: 'password',
    email: body.email,
    password: body.password,
  };
  return await authenticationService.authenticate(credentials);
}

/**
 * Handle user registration (password-based)
 *
 * @deprecated Password-based registration is deprecated.
 * Use Entra ID authentication instead.
 * This endpoint will be removed in a future version.
 */
async function handleRegister(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('DEPRECATED: Processing password registration request - use Entra ID instead');

  const requiredFields = ['email', 'firstName', 'lastName', 'role', 'password'];
  for (const field of requiredFields) {
    if (!body[field]) {
      return {
        success: false,
        message: `Missing required field: ${field}`,
      };
    }
  }

  const createUserRequest: CreateUserRequest = {
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role,
    password: body.password,
  };

  return await authenticationService.registerUser(createUserRequest);
}

/**
 * Handle token refresh
 */
async function handleRefresh(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing token refresh request');

  if (!body.refreshToken) {
    return {
      success: false,
      message: 'Refresh token is required',
    };
  }

  const credentials: AuthCredentials = { type: 'refresh_token', token: body.refreshToken };
  return await authenticationService.authenticate(credentials);
}

/**
 * Handle user logout
 */
async function handleLogout(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log('Processing logout request');

  if (!body.token) {
    return {
      success: false,
      message: 'Token is required for logout',
    };
  }

  // For now, return success as we don't have token blacklisting implemented
  // In the future, this could invalidate the token on the server side
  return {
    success: true,
    message: 'Logout successful',
  };
}

/**
 * Handle forgot password request
 *
 * @deprecated Password-based authentication is deprecated.
 * Users should reset passwords via Microsoft account settings.
 * This endpoint will be removed in a future version.
 */
async function handleForgotPassword(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log(
    'DEPRECATED: Processing forgot password request - consider using Microsoft account password reset',
  );

  if (!body.email) {
    return {
      success: false,
      message: 'Email is required',
    };
  }

  return await authenticationService.requestPasswordReset(body.email);
}

/**
 * Handle password reset confirmation
 *
 * @deprecated Password-based authentication is deprecated.
 * Users should reset passwords via Microsoft account settings.
 * This endpoint will be removed in a future version.
 */
async function handleResetPassword(body: any, context: InvocationContext): Promise<AuthResult> {
  context.log(
    'DEPRECATED: Processing password reset request - consider using Microsoft account password reset',
  );

  if (!body.token || !body.newPassword) {
    return {
      success: false,
      message: 'Reset token and new password are required',
    };
  }

  return await authenticationService.resetPassword(body.token, body.newPassword);
}

/**
 * Handle password change
 *
 * @deprecated Password-based authentication is deprecated.
 * Users should change passwords via Microsoft account settings at https://account.live.com/password/Change
 * This endpoint will be removed in a future version.
 */
async function handleChangePassword(
  body: any,
  request: HttpRequest,
  context: InvocationContext,
): Promise<AuthResult> {
  context.log(
    'DEPRECATED: Processing password change request - consider using Microsoft account password management',
  );

  if (!body.currentPassword || !body.newPassword) {
    return {
      success: false,
      message: 'Current password and new password are required',
    };
  }

  // Extract user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return {
      success: false,
      message: 'Authorization header is required',
    };
  }

  // For now, we'll need to decode the token to get the user ID
  // This could be improved with proper middleware
  try {
    const token = authHeader.replace('Bearer ', '');
    const decodedToken = jwt.decode(token) as any;
    return await authenticationService.changePassword(
      decodedToken.sub,
      body.currentPassword,
      body.newPassword,
    );
  } catch (error) {
    return {
      success: false,
      message: 'Invalid authorization token',
    };
  }
}
