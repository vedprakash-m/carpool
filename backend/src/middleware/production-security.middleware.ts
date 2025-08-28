/**
 * Production Security Middleware
 * Consolidates rate limiting, CORS, security headers, and input validation
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CorsMiddleware, CorsOptions } from './cors.middleware';
import { monitoringService } from '../services/enhanced-monitoring.service';

export interface SecurityConfig {
  cors: CorsOptions;
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
    skipSuccessfulRequests?: boolean;
  };
  headers: {
    hsts?: boolean;
    contentTypeOptions?: boolean;
    frameOptions?: boolean;
    xssProtection?: boolean;
    referrerPolicy?: boolean;
  };
  ipWhitelist?: string[];
  blockSuspiciousRequests?: boolean;
}

export class ProductionSecurityMiddleware {
  private static rateLimitTracking: Map<string, number[]>;

  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    cors: {
      origins:
        process.env.NODE_ENV === 'production'
          ? [
              'https://lively-stone-016bfa20f.6.azurestaticapps.net',
              'https://carpool.vedprakash.net',
              'https://vedprakash.net',
            ]
          : ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-Request-ID',
        'X-API-Key',
      ],
      credentials: true,
      maxAge: 86400,
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      skipSuccessfulRequests: false,
    },
    headers: {
      hsts: true,
      contentTypeOptions: true,
      frameOptions: true,
      xssProtection: true,
      referrerPolicy: true,
    },
    blockSuspiciousRequests: true,
  };

  /**
   * Apply comprehensive security middleware
   */
  static async applySecurityMiddleware(
    request: HttpRequest,
    context: InvocationContext,
    config: Partial<SecurityConfig> = {},
  ): Promise<HttpResponseInit | null> {
    const securityConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // 1. Handle CORS preflight
      const preflightResponse = CorsMiddleware.handlePreflight(request, securityConfig.cors);
      if (preflightResponse) {
        return this.addSecurityHeaders(preflightResponse, securityConfig);
      }

      // 2. IP Whitelist check (if configured)
      if (
        securityConfig.ipWhitelist &&
        !this.checkIPWhitelist(request, securityConfig.ipWhitelist)
      ) {
        monitoringService.trackSecurityEvent(
          'unauthorized_access',
          this.getClientIP(request),
          request.url || 'unknown',
          { reason: 'ip_not_whitelisted' },
        );

        return this.createSecurityResponse(403, 'Access denied from this IP address');
      }

      // 3. Suspicious request detection
      if (securityConfig.blockSuspiciousRequests && this.isSuspiciousRequest(request)) {
        monitoringService.trackSecurityEvent(
          'suspicious_activity',
          this.getClientIP(request),
          request.url || 'unknown',
          { reason: 'suspicious_patterns_detected' },
        );

        return this.createSecurityResponse(400, 'Request blocked due to suspicious patterns');
      }

      // 4. Rate limiting
      if (securityConfig.rateLimit.enabled) {
        const rateLimitResult = await this.applyRateLimit(
          request,
          context,
          securityConfig.rateLimit,
        );
        if (rateLimitResult) {
          return rateLimitResult;
        }
      }

      // 5. Input validation
      const validationResult = this.validateInput(request);
      if (validationResult) {
        return validationResult;
      }

      // If all checks pass, return null (continue to next middleware/handler)
      return null;
    } catch (error) {
      context.error('Security middleware error:', error);
      monitoringService.trackSecurityEvent(
        'suspicious_activity',
        this.getClientIP(request),
        request.url || 'unknown',
        { reason: 'security_middleware_error', error: error.message },
      );

      return this.createSecurityResponse(500, 'Security validation failed');
    }
  }

  /**
   * Add security headers to response
   */
  static addSecurityHeaders(response: HttpResponseInit, config: SecurityConfig): HttpResponseInit {
    const headers: Record<string, string> = {};

    // Copy existing headers
    if (response.headers) {
      if (response.headers instanceof Headers) {
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(response.headers)) {
        response.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, response.headers);
      }
    }

    // Apply CORS headers
    const corsHeaders = CorsMiddleware.createHeaders(config.cors);
    Object.assign(headers, corsHeaders);

    // Security headers
    if (config.headers.hsts) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    if (config.headers.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    if (config.headers.frameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    if (config.headers.xssProtection) {
      headers['X-XSS-Protection'] = '1; mode=block';
    }

    if (config.headers.referrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    // Additional security headers
    headers['Content-Security-Policy'] =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.applicationinsights.azure.com";
    headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';

    return {
      ...response,
      headers,
    };
  }

  private static async applyRateLimit(
    request: HttpRequest,
    context: InvocationContext,
    rateLimitConfig: SecurityConfig['rateLimit'],
  ): Promise<HttpResponseInit | null> {
    // For now, implement a simple in-memory rate limiter
    // In production, this should use Redis or Azure Cache for Redis
    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    // Simple in-memory tracking (replace with Redis in production)
    if (!this.rateLimitTracking) {
      this.rateLimitTracking = new Map();
    }

    const requestLog = this.rateLimitTracking.get(clientIP) || [];
    const recentRequests = requestLog.filter((timestamp) => timestamp > windowStart);

    if (recentRequests.length >= rateLimitConfig.maxRequests) {
      monitoringService.trackSecurityEvent(
        'rate_limit_exceeded',
        clientIP,
        request.url || 'unknown',
        {
          maxRequests: rateLimitConfig.maxRequests.toString(),
          windowMs: rateLimitConfig.windowMs.toString(),
          currentRequests: recentRequests.length.toString(),
        },
      );

      return this.createSecurityResponse(429, 'Too many requests. Please try again later.', {
        'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + rateLimitConfig.windowMs).toISOString(),
      });
    }

    // Record this request
    recentRequests.push(now);
    this.rateLimitTracking.set(clientIP, recentRequests);

    return null;
  }

  private static checkIPWhitelist(request: HttpRequest, whitelist: string[]): boolean {
    const clientIP = this.getClientIP(request);
    return whitelist.includes(clientIP) || whitelist.includes('*');
  }

  private static isSuspiciousRequest(request: HttpRequest): boolean {
    const url = request.url || '';
    const userAgent = request.headers.get('user-agent') || '';

    // Check for common attack patterns
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /drop.*table/i, // SQL injection
      /exec\(/i, // Code injection
      /eval\(/i, // Code injection
      /javascript:/i, // JavaScript injection
      /vbscript:/i, // VBScript injection
      /onload=/i, // Event handler injection
      /onerror=/i, // Event handler injection
    ];

    // Check URL and headers for suspicious patterns
    if (suspiciousPatterns.some((pattern) => pattern.test(url) || pattern.test(userAgent))) {
      return true;
    }

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /php/i,
    ];

    // Allow legitimate bots but flag obvious automated tools
    if (suspiciousUserAgents.some((pattern) => pattern.test(userAgent))) {
      // Allow known good bots
      const goodBots = [/googlebot/i, /bingbot/i, /msnbot/i, /slackbot/i, /facebookexternalhit/i];

      if (!goodBots.some((pattern) => pattern.test(userAgent))) {
        return true;
      }
    }

    return false;
  }

  private static validateInput(request: HttpRequest): HttpResponseInit | null {
    // Check content length
    const maxContentLength = 10 * 1024 * 1024; // 10MB
    const contentLength = parseInt(request.headers.get('content-length') || '0');

    if (contentLength > maxContentLength) {
      return this.createSecurityResponse(413, 'Request entity too large');
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type') || '';
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
      ];

      if (!allowedContentTypes.some((type) => contentType.includes(type))) {
        return this.createSecurityResponse(415, 'Unsupported Media Type');
      }
    }

    return null;
  }

  private static getClientIP(request: HttpRequest): string {
    // Check various headers for the real client IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip',
      'fastly-client-ip',
      'x-cluster-client-ip',
      'x-forwarded',
      'forwarded-for',
      'forwarded',
    ];

    for (const header of headers) {
      const value = request.headers.get(header);
      if (value) {
        // Take the first IP if there are multiple
        return value.split(',')[0].trim();
      }
    }

    // Fallback to connection remote address
    return 'unknown';
  }

  private static createSecurityResponse(
    status: number,
    message: string,
    additionalHeaders: Record<string, string> = {},
  ): HttpResponseInit {
    return {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...additionalHeaders,
      },
      jsonBody: {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Convenience function for applying security middleware
 */
export async function withSecurity(
  request: HttpRequest,
  context: InvocationContext,
  handler: (req: HttpRequest, ctx: InvocationContext) => Promise<HttpResponseInit>,
  config?: Partial<SecurityConfig>,
): Promise<HttpResponseInit> {
  // Apply security middleware
  const securityResult = await ProductionSecurityMiddleware.applySecurityMiddleware(
    request,
    context,
    config,
  );

  // If security middleware returns a response, return it (blocked request)
  if (securityResult) {
    return securityResult;
  }

  // Otherwise, execute the handler
  const response = await handler(request, context);

  // Add security headers to the response
  return ProductionSecurityMiddleware.addSecurityHeaders(response, {
    ...ProductionSecurityMiddleware['DEFAULT_CONFIG'],
    ...config,
  });
}
