import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { EntraAuthService } from '../src/services/entra-auth.service';
import { AuthService } from '../src/services/auth.service';

export async function authEntraUnified(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const entraAuthService = new EntraAuthService();

  try {
    // Handle different authentication flows
    const method = request.method;
    
    if (method === 'POST') {
      const body = await request.json() as any;
      
      // Entra External ID login
      if (body.authProvider === 'entra' && body.accessToken) {
        try {
          const entraUser = await entraAuthService.validateEntraToken(body.accessToken);
          if (entraUser) {
            const user = await entraAuthService.syncUserWithDatabase(entraUser);
            const sessionToken = await entraAuthService.generateSessionToken(user);
            const additionalVerification = await entraAuthService.requiresAdditionalVerification(user);
            
            return {
              status: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                success: true,
                user: {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  role: user.role,
                  authProvider: 'entra'
                },
                sessionToken,
                additionalVerification,
                migrated: user.authProvider === 'entra' && user.migrationDate
              })
            };
          }
        } catch (error) {
          context.error('Entra authentication failed:', error);
          // Return error for Entra auth attempts
          return {
            status: 401,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              success: false,
              error: 'Entra authentication failed',
              fallbackToLegacy: true
            })
          };
        }
      }
      
      // For legacy authentication, redirect to existing auth endpoints
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Use /api/auth-login-secure for email/password authentication'
        })
      };
    }
    
    // Token validation for protected routes
    if (method === 'GET') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: false,
            error: 'Missing or invalid authorization header'
          })
        };
      }

      const token = authHeader.substring(7);
      
      // Try Entra External ID validation first
      try {
        const entraUser = await entraAuthService.validateEntraToken(token);
        if (entraUser) {
          const user = await entraAuthService.syncUserWithDatabase(entraUser);
          
          return {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                authProvider: 'entra'
              }
            })
          };
        }
      } catch (error) {
        context.log('Entra token validation failed, trying legacy:', error.message);
      }

      // For legacy token validation, we'll need to use existing middleware
      // This endpoint focuses on Entra authentication
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid token - use existing auth endpoints for legacy tokens'
        })
      };
    }

    return {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };

  } catch (error) {
    context.error('Authentication service error:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Authentication service error'
      })
    };
  }
}
