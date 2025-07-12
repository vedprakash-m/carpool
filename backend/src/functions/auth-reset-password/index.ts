import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../../container';
import { resetPasswordSchema } from '@carpool/shared';
import { compose, validateBody, requestId, requestLogging } from '../../middleware';
import { UserDomainService } from '../../services/domains/user-domain.service';
import { handleError } from '../../utils/error-handler';
import { ILogger } from '../../utils/logger';
import { UserService } from '../../services/user.service';

async function resetPasswordHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const logger = container.resolve<ILogger>('ILogger');
  const userDomainService = container.resolve<UserDomainService>('UserDomainService');
  const userService = container.resolve<UserService>('UserService');

  try {
    const { token, newPassword } = request.validated!.body;

    // Reset password using the domain service
    const result = await userDomainService.resetPassword(token, newPassword);

    if (result.success) {
      logger.info('Password has been reset successfully');

      return {
        jsonBody: {
          success: true,
          message: result.message || 'Your password has been reset successfully.',
        },
      };
    } else {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: result.error || 'Failed to reset password',
        },
      };
    }
  } catch (error: any) {
    // Catch specific token errors for better messages
    if (error.name === 'TokenExpiredError') {
      return handleError(new Error('Password reset token has expired.'), request);
    }
    if (error.name === 'JsonWebTokenError') {
      return handleError(new Error('Invalid password reset token.'), request);
    }
    return handleError(error, request);
  }
}

app.http('auth-reset-password', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/reset-password',
  handler: compose(
    requestId,
    requestLogging,
    validateBody(resetPasswordSchema),
  )(resetPasswordHandler),
});
