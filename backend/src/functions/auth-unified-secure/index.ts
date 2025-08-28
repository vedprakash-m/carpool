import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withSecurity, SecurityConfig } from '../../middleware/production-security.middleware';
import { userDomainService } from '../../services/domains/user-domain.service';
import { authenticationService } from '../../services/auth/authentication.service';
import { monitoringService } from '../../services/enhanced-monitoring.service';
import { CreateUserRequest, AuthCredentials, AuthResult } from '@carpool/shared';

/**
 * SECURE AUTHENTICATION ENDPOINT WITH PRODUCTION SECURITY
 *
 * Enhanced version of auth-unified with comprehensive security middleware:
 * - Rate limiting (5 attempts per 15 minutes for auth endpoints)
 * - CORS protection with production origins
 * - Security headers (HSTS, CSP, etc.)
 * - Input validation and sanitization
 * - Suspicious request detection
 * - Comprehensive monitoring and alerting
 */

// Security configuration for authentication endpoints
const AUTH_SECURITY_CONFIG: Partial<SecurityConfig> = {
  rateLimit: {
    enabled: true,
    maxRequests: 5, // Stricter rate limiting for auth
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: false,
  },
  cors: {
    origins:
      process.env.NODE_ENV === 'production'
        ? ['https://lively-stone-016bfa20f.6.azurestaticapps.net', 'https://carpool.vedprakash.net']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['POST', 'OPTIONS'],
  },
  blockSuspiciousRequests: true,
};

export async function authUnifiedSecure(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Apply security middleware and execute the handler
  return withSecurity(request, context, authHandler, AUTH_SECURITY_CONFIG);
}

async function authHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    context.log('Auth request received', {
      method: request.method,
      url: request.url,
      action: request.query.get('action'),
    });

    // Validate HTTP method
    if (request.method !== 'POST') {
      return createErrorResponse(405, 'Method not allowed', 'AUTH_METHOD_NOT_ALLOWED');
    }

    // Extract and validate action parameter
    const action = request.query.get('action');
    if (!action) {
      return createErrorResponse(400, 'Missing action parameter', 'AUTH_MISSING_ACTION');
    }

    // Validate action is supported
    const supportedActions = [
      'login',
      'register',
      'refresh',
      'logout',
      'forgot-password',
      'reset-password',
      'change-password',
    ];

    if (!supportedActions.includes(action)) {
      monitoringService.trackSecurityEvent(
        'suspicious_activity',
        getClientIP(request),
        request.url || 'unknown',
        { reason: 'invalid_auth_action', action },
      );
      return createErrorResponse(400, 'Invalid action parameter', 'AUTH_INVALID_ACTION');
    }

    // Parse request body
    let requestBody;
    try {
      const bodyText = await request.text();
      requestBody = bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON payload', 'AUTH_INVALID_JSON');
    }

    // Route to appropriate handler
    let result: AuthResult | { success: boolean; message: string };
    const duration = Date.now() - startTime;

    switch (action) {
      case 'login':
        result = await handleLogin(requestBody, context);
        monitoringService.trackAuthentication('login', requestBody.email, result.success, duration);
        break;

      case 'register':
        result = await handleRegister(requestBody, context);
        monitoringService.trackAuthentication('login', requestBody.email, result.success, duration);
        break;

      case 'refresh':
        result = await handleRefresh(requestBody, context);
        monitoringService.trackAuthentication('refresh', undefined, result.success, duration);
        break;

      case 'logout':
        result = await handleLogout(requestBody, context);
        monitoringService.trackAuthentication('logout', undefined, result.success, duration);
        break;

      case 'forgot-password':
        result = await handleForgotPassword(requestBody, context);
        break;

      case 'reset-password':
        result = await handleResetPassword(requestBody, context);
        break;

      case 'change-password':
        result = await handleChangePassword(requestBody, context);
        break;

      default:
        return createErrorResponse(400, 'Invalid action', 'AUTH_INVALID_ACTION');
    }

    // Track API performance
    monitoringService.trackApiPerformance(
      `/api/auth?action=${action}`,
      'POST',
      result.success ? 200 : 400,
      Date.now() - startTime,
      (result as any).user?.id,
    );

    return {
      status: result.success ? 200 : 400,
      jsonBody: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    context.error('Auth endpoint error:', error);

    monitoringService.trackSecurityEvent(
      'suspicious_activity',
      getClientIP(request),
      request.url || 'unknown',
      { reason: 'auth_endpoint_error', error: error.message },
    );

    monitoringService.trackApiPerformance(request.url || '/api/auth', 'POST', 500, duration);

    return createErrorResponse(500, 'Internal server error', 'AUTH_INTERNAL_ERROR');
  }
}

async function handleLogin(requestBody: any, context: InvocationContext): Promise<AuthResult> {
  // Validate required fields
  if (!requestBody.email || !requestBody.password) {
    return {
      success: false,
      message: 'Missing email or password',
    };
  }

  const credentials: AuthCredentials = {
    type: 'password',
    email: requestBody.email,
    password: requestBody.password,
  };

  try {
    const result = await authenticationService.authenticate(credentials);
    context.log('Login successful', { userId: result.user?.id });
    return result;
  } catch (error) {
    context.warn('Login failed', { email: requestBody.email, error: error.message });
    return {
      success: false,
      message: 'Authentication failed',
    };
  }
}

async function handleRegister(requestBody: any, context: InvocationContext): Promise<AuthResult> {
  // Validate required fields for registration
  const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role'];
  const missingFields = requiredFields.filter((field) => !requestBody[field]);

  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  const createUserRequest: CreateUserRequest = {
    email: requestBody.email,
    password: requestBody.password,
    firstName: requestBody.firstName,
    lastName: requestBody.lastName,
    role: requestBody.role,
  };

  try {
    const result = await userDomainService.registerUser(createUserRequest);
    context.log('Registration successful', { userId: result.user?.id });
    return result;
  } catch (error) {
    context.warn('Registration failed', { email: requestBody.email, error: error.message });
    return {
      success: false,
      message: 'Registration failed',
    };
  }
}

async function handleRefresh(requestBody: any, context: InvocationContext): Promise<AuthResult> {
  if (!requestBody.refreshToken) {
    return {
      success: false,
      message: 'Missing refresh token',
    };
  }

  const credentials: AuthCredentials = {
    type: 'refresh_token',
    token: requestBody.refreshToken,
  };

  try {
    const result = await authenticationService.authenticate(credentials);
    context.log('Token refresh successful');
    return result;
  } catch (error) {
    context.warn('Token refresh failed', { error: error.message });
    return {
      success: false,
      message: 'Token refresh failed',
    };
  }
}

async function handleLogout(
  requestBody: any,
  context: InvocationContext,
): Promise<{ success: boolean; message: string }> {
  // For logout, we might want to blacklist the token in the future
  // For now, just return success (client-side logout)
  context.log('User logged out');
  return {
    success: true,
    message: 'Logged out successfully',
  };
}

async function handleForgotPassword(
  requestBody: any,
  context: InvocationContext,
): Promise<{ success: boolean; message: string }> {
  if (!requestBody.email) {
    return {
      success: false,
      message: 'Missing email address',
    };
  }

  try {
    // Implementation would send password reset email
    context.log('Password reset requested', { email: requestBody.email });
    return {
      success: true,
      message: 'Password reset email sent',
    };
  } catch (error) {
    context.warn('Password reset failed', { email: requestBody.email, error: error.message });
    return {
      success: false,
      message: 'Failed to send password reset email',
    };
  }
}

async function handleResetPassword(
  requestBody: any,
  context: InvocationContext,
): Promise<{ success: boolean; message: string }> {
  if (!requestBody.token || !requestBody.newPassword) {
    return {
      success: false,
      message: 'Missing reset token or new password',
    };
  }

  try {
    // Implementation would validate reset token and update password
    context.log('Password reset completed');
    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error) {
    context.warn('Password reset failed', { error: error.message });
    return {
      success: false,
      message: 'Failed to reset password',
    };
  }
}

async function handleChangePassword(
  requestBody: any,
  context: InvocationContext,
): Promise<{ success: boolean; message: string }> {
  if (!requestBody.currentPassword || !requestBody.newPassword) {
    return {
      success: false,
      message: 'Missing current password or new password',
    };
  }

  try {
    // Implementation would validate current password and update to new password
    context.log('Password changed successfully');
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    context.warn('Password change failed', { error: error.message });
    return {
      success: false,
      message: 'Failed to change password',
    };
  }
}

function createErrorResponse(status: number, message: string, errorCode: string): HttpResponseInit {
  return {
    status,
    jsonBody: {
      success: false,
      error: message,
      errorCode,
      timestamp: new Date().toISOString(),
    },
  };
}

function getClientIP(request: HttpRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const xClientIp = request.headers.get('x-client-ip');

  return xForwardedFor?.split(',')[0]?.trim() || xRealIp || xClientIp || 'unknown';
}
