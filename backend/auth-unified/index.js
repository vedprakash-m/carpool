module.exports = function (context, req) {
  context.log('Unified authentication endpoint called');

  try {
    const method = req.method;

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      context.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
      return;
    }

    if (method !== 'POST') {
      context.res = {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: {
          success: false,
          message: 'Method not allowed. Use POST.',
        },
      };
      return;
    }

    // Get action from query parameters
    const action = req.query && req.query.action;

    if (!action) {
      context.res = {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: {
          success: false,
          message: 'Action parameter is required. Use ?action=login, ?action=register, etc.',
        },
      };
      return;
    }

    context.log(`Processing action: ${action}`);

    // For now, return a basic response indicating the endpoint is working
    // TODO: Implement actual authentication logic
    switch (action) {
      case 'login':
        context.res = {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Login endpoint working - implementation in progress',
            action: 'login',
          },
        };
        break;

      case 'register':
        context.res = {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Register endpoint working - implementation in progress',
            action: 'register',
          },
        };
        break;

      case 'refresh':
        context.res = {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            message: 'Refresh endpoint working - implementation in progress',
            action: 'refresh',
          },
        };
        break;

      default:
        context.res = {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: {
            success: false,
            message: `Unknown action: ${action}. Supported actions: login, register, refresh`,
          },
        };
        break;
    }
  } catch (error) {
    context.log.error('Error in unified auth endpoint:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        message: 'Internal server error',
        error: error.message,
      },
    };
  }
};
