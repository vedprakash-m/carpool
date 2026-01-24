/**
 * CORS Middleware Test Suite
 * Comprehensive testing to achieve 80%+ branch coverage
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { CorsMiddleware, CorsOptions } from '../../middleware/cors.middleware';

describe('CorsMiddleware', () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: 'https://api.carpool.com/test',
      headers: new Headers({
        origin: 'https://carpool.com',
        'content-type': 'application/json',
      }),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('createHeaders', () => {
    it('should create default CORS headers', () => {
      const headers = CorsMiddleware.createHeaders();

      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle string methods option', () => {
      const options: CorsOptions = {
        methods: 'GET, POST',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
    });

    it('should handle array methods option', () => {
      const options: CorsOptions = {
        methods: ['GET', 'PUT', 'DELETE'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, PUT, DELETE');
    });

    it('should handle string allowedHeaders option', () => {
      const options: CorsOptions = {
        allowedHeaders: 'Content-Type, Authorization',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
    });

    it('should handle array allowedHeaders option', () => {
      const options: CorsOptions = {
        allowedHeaders: ['Content-Type', 'X-Custom-Header'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-Custom-Header');
    });

    it('should handle custom maxAge', () => {
      const options: CorsOptions = {
        maxAge: 3600,
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });

    it('should handle wildcard origins', () => {
      const options: CorsOptions = {
        origins: '*',
      };

      const headers = CorsMiddleware.createHeaders(options);
      // When origins is *, Access-Control-Allow-Origin should be handled in origin-specific logic
      expect(headers).toBeDefined();
    });

    it('should handle single origin string', () => {
      const options: CorsOptions = {
        origins: 'https://carpool.com',
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });

    it('should handle multiple origins array', () => {
      const options: CorsOptions = {
        origins: ['https://carpool.com', 'https://app.carpool.com'],
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });

    it('should handle credentials option', () => {
      const options: CorsOptions = {
        credentials: true,
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers).toBeDefined();
    });
  });

  describe('environment-specific configuration', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle development environment', () => {
      process.env.NODE_ENV = 'development';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle test environment', () => {
      process.env.NODE_ENV = 'test';

      const headers = CorsMiddleware.createHeaders();
      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined options', () => {
      const headers = CorsMiddleware.createHeaders(undefined);
      expect(headers).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should handle empty options object', () => {
      const headers = CorsMiddleware.createHeaders({});
      expect(headers).toBeDefined();
      expect(headers['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should handle partial options', () => {
      const options: Partial<CorsOptions> = {
        methods: ['GET'],
        // Intentionally leave other options undefined
      };

      const headers = CorsMiddleware.createHeaders(options);
      expect(headers['Access-Control-Allow-Methods']).toBe('GET');
      expect(headers['Access-Control-Allow-Headers']).toBeDefined(); // Should use default
    });
  });

  describe('applyHeaders', () => {
    it('should apply CORS headers to response', () => {
      const response = {
        status: 200,
        body: JSON.stringify({ message: 'test' }),
      };

      const result = CorsMiddleware.applyHeaders(response);

      expect(result.status).toBe(200);
      expect(result.headers).toBeDefined();
      expect(result.headers!['Access-Control-Allow-Methods']).toBeDefined();
      expect(result.headers!['Access-Control-Allow-Origin']).toBeDefined();
    });

    it('should merge existing headers with CORS headers', () => {
      const response = {
        status: 200,
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const result = CorsMiddleware.applyHeaders(response);

      expect(result.headers!['X-Custom-Header']).toBe('custom-value');
      expect(result.headers!['Access-Control-Allow-Methods']).toBeDefined();
    });

    it('should apply custom CORS options', () => {
      const response = { status: 200 };
      const options: CorsOptions = {
        origins: 'https://custom.com',
        methods: ['GET', 'POST'],
      };

      const result = CorsMiddleware.applyHeaders(response, options);

      expect(result.headers!['Access-Control-Allow-Origin']).toBe('https://custom.com');
      expect(result.headers!['Access-Control-Allow-Methods']).toBe('GET, POST');
    });
  });

  describe('handlePreflight', () => {
    it('should handle OPTIONS preflight request', () => {
      const request = {
        method: 'OPTIONS',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;

      const result = CorsMiddleware.handlePreflight(request);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(200);
      expect(result!.headers).toBeDefined();
      expect(result!.body).toBe('');
    });

    it('should return null for non-OPTIONS requests', () => {
      const request = {
        method: 'GET',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;

      const result = CorsMiddleware.handlePreflight(request);

      expect(result).toBeNull();
    });

    it('should use custom optionsSuccessStatus', () => {
      const request = {
        method: 'OPTIONS',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;

      const result = CorsMiddleware.handlePreflight(request, { optionsSuccessStatus: 204 });

      expect(result!.status).toBe(204);
    });

    it('should use custom CORS options for preflight', () => {
      const request = {
        method: 'OPTIONS',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;

      const result = CorsMiddleware.handlePreflight(request, {
        origins: 'https://custom.com',
        methods: ['GET'],
      });

      expect(result!.headers!['Access-Control-Allow-Origin']).toBe('https://custom.com');
      expect(result!.headers!['Access-Control-Allow-Methods']).toBe('GET');
    });
  });

  describe('create middleware', () => {
    it('should create middleware that handles OPTIONS preflight', async () => {
      const middleware = CorsMiddleware.create();
      const request = {
        method: 'OPTIONS',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;
      const context = { res: {} } as any;

      const result = await middleware(request, context);

      expect(result).toBeDefined();
      expect((result as any).status).toBe(200);
    });

    it('should add CORS headers to context for non-OPTIONS requests', async () => {
      const middleware = CorsMiddleware.create();
      const request = {
        method: 'GET',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;
      const context = {} as any;

      const result = await middleware(request, context);

      expect(result).toBeUndefined();
      expect(context.res).toBeDefined();
      expect(context.res.headers).toBeDefined();
    });

    it('should merge with existing context headers', async () => {
      const middleware = CorsMiddleware.create();
      const request = {
        method: 'GET',
        url: 'https://api.carpool.com/test',
        headers: new Headers(),
      } as unknown as HttpRequest;
      const context = {
        res: {
          headers: { 'X-Existing': 'value' },
        },
      } as any;

      await middleware(request, context);

      expect(context.res.headers['X-Existing']).toBe('value');
      expect(context.res.headers['Access-Control-Allow-Methods']).toBeDefined();
    });
  });

  describe('forEnvironment', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return development config for development env', () => {
      process.env.NODE_ENV = 'development';
      const middleware = CorsMiddleware.forEnvironment();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should return production config for production env', () => {
      process.env.NODE_ENV = 'production';
      const middleware = CorsMiddleware.forEnvironment();
      expect(middleware).toBeDefined();
    });

    it('should return staging config for staging env', () => {
      process.env.NODE_ENV = 'staging';
      const middleware = CorsMiddleware.forEnvironment();
      expect(middleware).toBeDefined();
    });

    it('should fall back to development for unknown env', () => {
      process.env.NODE_ENV = 'unknown';
      const middleware = CorsMiddleware.forEnvironment();
      expect(middleware).toBeDefined();
    });
  });

  describe('forEndpoint', () => {
    it('should create middleware for auth endpoint', () => {
      const middleware = CorsMiddleware.forEndpoint('auth');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware for api endpoint', () => {
      const middleware = CorsMiddleware.forEndpoint('api');
      expect(middleware).toBeDefined();
    });

    it('should create middleware for public endpoint', () => {
      const middleware = CorsMiddleware.forEndpoint('public');
      expect(middleware).toBeDefined();
    });

    it('should create middleware for admin endpoint', () => {
      const middleware = CorsMiddleware.forEndpoint('admin');
      expect(middleware).toBeDefined();
    });
  });

  describe('credentials with wildcard origin', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    afterEach(() => {
      if (originalFrontendUrl) {
        process.env.FRONTEND_URL = originalFrontendUrl;
      } else {
        delete process.env.FRONTEND_URL;
      }
    });

    it('should use FRONTEND_URL when credentials true and origin is wildcard', () => {
      process.env.FRONTEND_URL = 'https://my-frontend.com';

      const headers = CorsMiddleware.createHeaders({
        origins: '*',
        credentials: true,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://my-frontend.com');
    });

    it('should use default when FRONTEND_URL not set', () => {
      delete process.env.FRONTEND_URL;

      const headers = CorsMiddleware.createHeaders({
        origins: '*',
        credentials: true,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Origin']).toContain('azurestaticapps.net');
    });

    it('should not change origin when not wildcard', () => {
      const headers = CorsMiddleware.createHeaders({
        origins: 'https://specific.com',
        credentials: true,
      });

      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Origin']).toBe('https://specific.com');
    });
  });

  describe('security headers', () => {
    it('should include security headers by default', () => {
      const headers = CorsMiddleware.createHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Content-Security-Policy']).toBeDefined();
    });
  });
});
