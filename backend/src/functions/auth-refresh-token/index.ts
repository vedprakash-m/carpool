import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../../container';
import { compose, requestId, requestLogging } from '../../middleware';
import { UserDomainService } from '../../services/domains/user-domain.service';
import { handleError } from '../../utils/error-handler';
import { ILogger } from '../../utils/logger';

async function refreshTokenHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger');
  const userDomainService = container.resolve<UserDomainService>('UserDomainService');

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!body || typeof body.refreshToken !== 'string') {
      throw new Error('Refresh token is required.');
    }

    const { refreshToken } = body;
    const result = await userDomainService.refreshToken(refreshToken);

    if (result.success) {
      return {
        jsonBody: {
          success: true,
          message: 'Token refreshed successfully',
          data: {
            accessToken: result.token,
            refreshToken: result.refreshToken || refreshToken, // Return new or original refresh token
            user: result.user,
          },
        },
      };
    } else {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: result.message || 'Invalid refresh token',
        },
      };
    }
  } catch (error) {
    return handleError(error, request);
  }
}

app.http('auth-refresh-token', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh-token',
  handler: compose(requestId, requestLogging)(refreshTokenHandler),
});
