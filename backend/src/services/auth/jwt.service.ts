/**
 * Unified JWT Service Implementation
 *
 * Implements the IJWTService contract with consistent token handling.
 * Replaces the fragmented JWT implementations across multiple services.
 */

import * as jwt from 'jsonwebtoken';
import jwksClient = require('jwks-rsa');
import { UserEntity } from '@carpool/shared';
import {
  IJWTService,
  JWTPayload,
  JWTConfig,
  TokenType,
  StandardJWTPayload,
  createSignOptions,
  createVerifyOptions,
  getJWTConfig,
} from '@carpool/shared';

export class JWTService implements IJWTService {
  private readonly config: JWTConfig;
  private readonly jwksClient: jwksClient.JwksClient;

  constructor(config?: Partial<JWTConfig>) {
    this.config = { ...getJWTConfig(), ...config };

    // Configure JWKS client for Microsoft Entra ID
    const tenantId = process.env.AZURE_TENANT_ID || 'vedprakashmoutlook.onmicrosoft.com';
    const jwksUri = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;

    this.jwksClient = jwksClient({
      jwksUri,
      requestHeaders: {}, // Optional
      timeout: 30000, // Defaults to 30s
      cache: true, // Cache keys for 10 minutes by default
      rateLimit: true,
      jwksRequestsPerMinute: 10, // Increase for production
      cacheMaxEntries: 5, // Cache up to 5 keys
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
    });
  }

  /**
   * Generate access token for authenticated user
   */
  generateAccessToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getPermissionsForRole(user.role),
      authProvider: user.authProvider,
      type: TokenType.ACCESS,
      iat: Math.floor(Date.now() / 1000),
      // Don't set iss, aud, or exp here - let JWT library handle them
      familyId: user.familyId,
      groupMemberships: user.groupMemberships?.map((m) => m.groupId) || [],
    };

    const options = createSignOptions(this.config, TokenType.ACCESS);
    return jwt.sign(payload, options.secret, {
      expiresIn: options.expiresIn,
      issuer: options.issuer,
      audience: options.audience,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token for authenticated user
   */
  generateRefreshToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.getPermissionsForRole(user.role),
      authProvider: user.authProvider,
      type: TokenType.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      // Don't set iss, aud, or exp here - let JWT library handle them
    };

    const options = createSignOptions(this.config, TokenType.REFRESH);
    return jwt.sign(payload, options.secret, {
      expiresIn: options.expiresIn,
      issuer: options.issuer,
      audience: options.audience,
    } as jwt.SignOptions);
  }

  /**
   * Validate access token and return payload
   */
  async validateAccessToken(token: string): Promise<JWTPayload> {
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) {
      throw new Error('Invalid token');
    }

    // Entra ID token validation
    if (
      typeof decodedToken.payload === 'object' &&
      decodedToken.payload.iss &&
      typeof decodedToken.payload.iss === 'string' &&
      decodedToken.payload.iss.includes('microsoftonline')
    ) {
      try {
        const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        // Validate Entra ID specific configuration
        const expectedIssuer = `https://login.microsoftonline.com/${
          process.env.AZURE_TENANT_ID || 'vedprakashmoutlook.onmicrosoft.com'
        }/v2.0`;
        const expectedAudience =
          process.env.AZURE_CLIENT_ID || 'c5118183-d391-4a86-ad73-29162678a5f0';

        const payload = jwt.verify(token, signingKey, {
          algorithms: ['RS256'],
          issuer: expectedIssuer,
          audience: expectedAudience,
        }) as StandardJWTPayload;

        return {
          sub: payload.sub,
          email: payload.email,
          role: payload.role as any,
          permissions: payload.permissions,
          authProvider: 'entra' as any,
          iat: payload.iat,
          exp: payload.exp,
          iss: payload.iss,
          aud: payload.aud,
        };
      } catch (error) {
        console.error('Entra ID token validation failed:', error);
        throw new Error(`Entra ID token validation failed: ${error.message}`);
      }
    } else {
      // Legacy token validation for internal JWT tokens
      const options = createVerifyOptions(this.config, TokenType.ACCESS);

      try {
        const payload = jwt.verify(token, options.secret, {
          issuer: options.issuer,
          audience: options.audience,
          algorithms: options.algorithms,
        }) as StandardJWTPayload;

        if (payload.type !== TokenType.ACCESS) {
          throw new Error('Invalid token type');
        }

        return {
          sub: payload.sub,
          email: payload.email,
          role: payload.role as any,
          permissions: payload.permissions,
          authProvider: 'internal' as any,
          iat: payload.iat,
          exp: payload.exp,
          iss: payload.iss,
          aud: payload.aud,
        };
      } catch (error) {
        console.error('Internal token validation failed:', error);
        throw new Error(`Token validation failed: ${error.message}`);
      }
    }
  }

  /**
   * Validate refresh token and return payload
   */
  async validateRefreshToken(token: string): Promise<JWTPayload> {
    const options = createVerifyOptions(this.config, TokenType.REFRESH);

    try {
      const payload = jwt.verify(token, options.secret, {
        issuer: options.issuer,
        audience: options.audience,
        algorithms: options.algorithms,
      }) as StandardJWTPayload;

      if (payload.type !== TokenType.REFRESH) {
        throw new Error('Invalid token type');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role as any,
        permissions: payload.permissions,
        authProvider: payload.authProvider as any,
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        aud: payload.aud,
      };
    } catch (error) {
      throw new Error(
        `Refresh token validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(user: UserEntity): string {
    const payload: StandardJWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: TokenType.PASSWORD_RESET,
      authProvider: user.authProvider || 'local',
      permissions: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    return jwt.sign(payload, this.config.accessTokenSecret, {
      algorithm: this.config.algorithm,
    });
  }

  /**
   * Verify password reset token
   */ verifyPasswordResetToken(token: string): StandardJWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.accessTokenSecret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as StandardJWTPayload;

      if (decoded.type !== TokenType.PASSWORD_RESET) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Get permissions for user role
   */
  private getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      super_admin: [
        'admin:read',
        'admin:write',
        'admin:delete',
        'groups:manage',
        'users:manage',
        'system:manage',
        'trips:manage',
        'notifications:manage',
      ],
      group_admin: [
        'groups:read',
        'groups:write',
        'groups:manage_own',
        'trips:read',
        'trips:write',
        'users:read_group',
        'notifications:send_group',
      ],
      parent: [
        'profile:read',
        'profile:write',
        'groups:read',
        'groups:join',
        'trips:read',
        'trips:participate',
        'preferences:manage',
        'children:manage',
      ],
      student: ['profile:read', 'trips:read', 'trips:participate'],
    };

    return permissions[role] || permissions.parent;
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 3600);
  }
}
