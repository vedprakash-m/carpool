const { app } = require('@azure/functions');

app.http('auth-unified', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth',
  handler: async (request, context) => {
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
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        };
      }

      // Get action from query parameters
      const action = request.query.get('action');
      
      if (!action) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            message: 'Action parameter is required. Use ?action=login, ?action=register, etc.',
          },
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        };
      }

      context.log(`Processing action: ${action}`);

      // For now, return a basic response indicating the endpoint is working
      // TODO: Implement actual authentication logic
      switch (action) {
        case 'login':
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Login endpoint working - implementation in progress',
              action: 'login',
            },
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          };

        case 'register':
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Register endpoint working - implementation in progress',
              action: 'register',
            },
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          };

        case 'refresh':
          return {
            status: 200,
            jsonBody: {
              success: true,
              message: 'Refresh endpoint working - implementation in progress',
              action: 'refresh',
            },
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          };

        default:
          return {
            status: 400,
            jsonBody: {
              success: false,
              message: `Unknown action: ${action}. Supported actions: login, register, refresh`,
            },
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
          };
      }
    } catch (error) {
      context.log.error('Error in unified auth endpoint:', error);
      
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'Internal server error',
          error: error.message,
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      };
    }
  },
});
